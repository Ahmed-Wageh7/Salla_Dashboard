import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { animate, style, transition, trigger } from '@angular/animations';
import { RouterModule } from '@angular/router';
import { catchError, forkJoin, of } from 'rxjs';
import { AdminApiService } from '../../core/api/admin-api.service';
import { CategoryRecord, ProductPayload, ProductRecord, SubcategoryRecord } from '../../core/api/admin.models';
import { ToastService } from '../../shared/toast/toast.service';

interface ProductFormState {
  id: string | null;
  name: string;
  description: string;
  price: number;
  stock: number;
  category: string;
  subcategory: string;
  images: string;
}

@Component({
  selector: 'app-products',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './products.html',
  styleUrls: ['./products.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [
    trigger('pageSwap', [
      transition('* => *', [
        style({ opacity: 0, transform: 'translateY(12px)' }),
        animate('260ms cubic-bezier(0.2, 0.8, 0.2, 1)', style({ opacity: 1, transform: 'translateY(0)' })),
      ]),
    ]),
  ],
})
export class ProductsComponent {
  private readonly storageKey = 'products.currentPage';
  private readonly adminApi = inject(AdminApiService);
  private readonly toastService = inject(ToastService);
  private readonly pageSize = 20;
  private readonly pageWindowSize = 4;

  readonly products = signal<ProductRecord[]>([]);
  readonly categories = signal<CategoryRecord[]>([]);
  readonly subcategories = signal<SubcategoryRecord[]>([]);
  readonly isLoading = signal(true);
  readonly isSaving = signal(false);
  readonly isDeleting = signal(false);
  readonly stockSavingId = signal('');
  readonly errorMessage = signal('');
  readonly searchQuery = signal('');
  readonly sort = signal('-createdAt');
  readonly currentPage = signal(1);
  readonly hasNextPage = signal(false);
  readonly stockDrafts = signal<Record<string, number>>({});
  readonly isFormModalOpen = signal(false);
  readonly isDeleteModalOpen = signal(false);
  readonly pendingDeleteId = signal<string | null>(null);
  readonly form = signal<ProductFormState>(this.emptyForm());
  readonly categoryNameById = computed(() => {
    const map = new Map<string, string>();

    for (const category of this.categories()) {
      const id = this.categoryId(category);
      if (id) {
        map.set(id, category.name);
      }
    }

    return map;
  });
  readonly subcategoryNameById = computed(() => {
    const map = new Map<string, string>();

    for (const subcategory of this.subcategories()) {
      const id = this.subcategoryId(subcategory);
      if (id) {
        map.set(id, subcategory.name);
      }
    }

    return map;
  });

  readonly filteredProducts = computed(() => {
    const query = this.searchQuery().trim().toLowerCase();

    return this.products().filter((product) => {
      if (!query) return true;

      return [
        product.name ?? '',
        product.description ?? '',
        this.categoryLabel(product),
        this.subcategoryLabel(product),
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query));
    });
  });

  readonly availableSubcategories = computed(() => {
    const categoryId = this.form().category.trim();

    return this.subcategories().filter((subcategory) => {
      const ownerId = this.subcategoryCategoryId(subcategory);
      return !categoryId || ownerId === categoryId;
    });
  });

  readonly visibleRange = computed(() => {
    const productsOnPage = this.filteredProducts().length;
    const start = productsOnPage === 0 ? 0 : (this.currentPage() - 1) * this.pageSize + 1;
    const end = productsOnPage === 0 ? 0 : start + productsOnPage - 1;

    return { start, end };
  });

  readonly paginationItems = computed(() => {
    const current = this.currentPage();
    const hasNext = this.hasNextPage();
    const start = Math.max(1, current - 1);
    const maxVisible = this.pageWindowSize;
    let end = start + maxVisible - 1;

    if (!hasNext) {
      end = current;
    } else {
      end = Math.max(current + 1, end);
    }

    return Array.from({ length: end - start + 1 }, (_, index) => start + index);
  });

  constructor() {
    this.currentPage.set(this.readPersistedPage());
    this.loadCatalogReferences();
    this.loadProducts();
  }

  loadProducts(): void {
    this.isLoading.set(true);
    this.errorMessage.set('');

    this.adminApi
      .getAdminProducts({ sort: this.sort(), limit: this.pageSize, page: this.currentPage() })
      .subscribe({
      next: (products) => {
        this.products.set(products);
        this.hasNextPage.set(products.length === this.pageSize);
        if (!products.length && this.currentPage() > 1) {
          this.currentPage.update((page) => page - 1);
          this.persistCurrentPage();
          this.loadProducts();
          return;
        }
        this.stockDrafts.set(
          products.reduce<Record<string, number>>((acc, product) => {
            acc[this.id(product)] = Number(product.stock ?? 0);
            return acc;
          }, {}),
        );
        this.persistCurrentPage();
        this.isLoading.set(false);
      },
      error: (error) => {
        this.errorMessage.set(error?.error?.message || 'Unable to load products from the backend.');
        this.toastService.error(error?.error?.message || 'Unable to load products from the backend.');
        this.isLoading.set(false);
      },
      });
  }

  loadCatalogReferences(): void {
    let referenceError = '';

    forkJoin({
      categories: this.adminApi.getCategories().pipe(
        catchError((error) => {
          referenceError ||= this.getApiErrorMessage(error, 'Unable to load categories.');
          return of([] as CategoryRecord[]);
        }),
      ),
      subcategories: this.adminApi.getSubcategories().pipe(
        catchError((error) => {
          referenceError ||= this.getApiErrorMessage(error, 'Unable to load subcategories.');
          return of([] as SubcategoryRecord[]);
        }),
      ),
    }).subscribe(({ categories, subcategories }) => {
      this.categories.set(categories);
      this.subcategories.set(subcategories);

      if (referenceError) {
        this.errorMessage.set(referenceError);
        this.toastService.error(referenceError);
      }
    });
  }

  updateSearch(query: string): void {
    this.searchQuery.set(query);
  }

  updateSort(sort: string): void {
    this.sort.set(sort);
    this.currentPage.set(1);
    this.persistCurrentPage();
    this.loadProducts();
  }

  nextPage(): void {
    if (!this.hasNextPage() || this.isLoading()) return;
    this.currentPage.update((page) => page + 1);
    this.persistCurrentPage();
    this.loadProducts();
  }

  previousPage(): void {
    if (this.currentPage() === 1 || this.isLoading()) return;
    this.currentPage.update((page) => page - 1);
    this.persistCurrentPage();
    this.loadProducts();
  }

  goToPage(page: number): void {
    if (page < 1 || page === this.currentPage() || this.isLoading()) return;
    if (page > this.currentPage() && !this.hasNextPage() && !this.paginationItems().includes(page)) {
      return;
    }

    this.currentPage.set(page);
    this.persistCurrentPage();
    this.loadProducts();
  }

  selectProduct(product: ProductRecord): void {
    this.form.set({
      id: this.id(product),
      name: product.name ?? '',
      description: product.description ?? '',
      price: Number(product.price ?? 0),
      stock: Number(product.stock ?? 0),
      category: this.referenceId(product.category),
      subcategory: this.referenceId(product.subcategory),
      images: (product.images ?? []).join(', '),
    });
    this.isFormModalOpen.set(true);
  }

  resetForm(): void {
    this.form.set(this.emptyForm());
    this.isFormModalOpen.set(false);
  }

  openCreateModal(): void {
    this.form.set(this.emptyForm());
    this.isFormModalOpen.set(true);
  }

  saveProduct(): void {
    const form = this.form();
    const categoryId = form.category.trim();
    const subcategoryId = form.subcategory.trim();

    if (!this.isMongoId(categoryId) || !this.isMongoId(subcategoryId)) {
      const message = 'Category ID and Subcategory ID must be valid 24-character hexadecimal values.';
      this.errorMessage.set(message);
      this.toastService.error(message);
      return;
    }

    const payload: ProductPayload = {
      name: form.name.trim(),
      description: form.description.trim(),
      price: Number(form.price),
      stock: Number(form.stock),
      category: categoryId,
      subcategory: subcategoryId,
      images: form.images
        .split(',')
        .map((image) => image.trim())
        .filter(Boolean),
    };

    this.isSaving.set(true);
    this.errorMessage.set('');

    const request = form.id
      ? this.adminApi.updateProduct(form.id, payload)
      : this.adminApi.createProduct(payload);

    request.subscribe({
      next: () => {
        this.toastService.success(form.id ? 'Product updated successfully.' : 'Product created successfully.');
        this.form.set(this.emptyForm());
        this.isFormModalOpen.set(false);
        this.currentPage.set(1);
        this.persistCurrentPage();
        this.loadProducts();
        this.isSaving.set(false);
      },
      error: (error) => {
        const message = this.getApiErrorMessage(error, 'Unable to save product.');
        this.errorMessage.set(message);
        this.toastService.error(message);
        this.isSaving.set(false);
      },
    });
  }

  requestDelete(product: ProductRecord): void {
    this.pendingDeleteId.set(this.id(product));
    this.isDeleteModalOpen.set(true);
  }

  closeDeleteModal(): void {
    this.pendingDeleteId.set(null);
    this.isDeleteModalOpen.set(false);
  }

  confirmDelete(): void {
    const id = this.pendingDeleteId();
    if (!id) return;

    this.isDeleting.set(true);
    this.errorMessage.set('');

    this.adminApi.deleteProduct(id).subscribe({
      next: () => {
        this.toastService.success('Product deleted successfully.');
        if (this.form().id === id) this.form.set(this.emptyForm());
        this.closeDeleteModal();
        if (this.products().length === 1 && this.currentPage() > 1) {
          this.currentPage.update((page) => page - 1);
          this.persistCurrentPage();
        }
        this.loadProducts();
        this.isDeleting.set(false);
      },
      error: (error) => {
        this.errorMessage.set(error?.error?.message || 'Unable to delete product.');
        this.toastService.error(error?.error?.message || 'Unable to delete product.');
        this.isDeleting.set(false);
      },
    });
  }

  setStockDraft(id: string, stock: number): void {
    this.stockDrafts.update((drafts) => ({ ...drafts, [id]: Number(stock) }));
  }

  saveStock(product: ProductRecord): void {
    const id = this.id(product);
    const stock = Number(this.stockDrafts()[id] ?? 0);
    if (stock === Number(product.stock ?? 0)) return;

    this.stockSavingId.set(id);

    this.adminApi.updateProductStock(id, stock).subscribe({
      next: () => {
        this.toastService.success('Stock updated successfully.');
        this.loadProducts();
        this.stockSavingId.set('');
      },
      error: (error) => {
        this.errorMessage.set(error?.error?.message || 'Unable to update stock.');
        this.toastService.error(error?.error?.message || 'Unable to update stock.');
        this.stockSavingId.set('');
      },
    });
  }

  updateForm<K extends keyof ProductFormState>(key: K, value: ProductFormState[K]): void {
    this.form.update((current) => {
      const next = { ...current, [key]: value } as ProductFormState;

      if (key === 'category') {
        const selectedCategoryId = String(value ?? '').trim();
        const currentSubcategoryId = current.subcategory.trim();

        if (
          currentSubcategoryId &&
          !this.subcategories().some(
            (subcategory) =>
              this.subcategoryId(subcategory) === currentSubcategoryId &&
              this.subcategoryCategoryId(subcategory) === selectedCategoryId,
          )
        ) {
          next.subcategory = '';
        }
      }

      return next;
    });
  }

  trackById(_: number, product: ProductRecord): string {
    return this.id(product);
  }

  id(product: ProductRecord): string {
    return product._id ?? product.id ?? '';
  }

  categoryLabel(product: ProductRecord): string {
    return this.resolveReferenceLabel(product.category, this.categoryNameById());
  }

  subcategoryLabel(product: ProductRecord): string {
    return this.resolveReferenceLabel(product.subcategory, this.subcategoryNameById());
  }

  categoryId(category: CategoryRecord): string {
    return category._id ?? category.id ?? '';
  }

  subcategoryId(subcategory: SubcategoryRecord): string {
    return subcategory._id ?? subcategory.id ?? '';
  }

  subcategoryCategoryId(subcategory: SubcategoryRecord): string {
    return this.referenceId(subcategory.category ?? subcategory.categoryId ?? subcategory.category_id ?? '');
  }

  referenceId(
    value:
      | ProductRecord['category']
      | ProductRecord['subcategory']
      | SubcategoryRecord['category']
      | string
      | null
      | undefined,
  ): string {
    if (!value) return '';
    if (typeof value === 'string') return value;
    return value._id ?? value.id ?? value.name ?? '';
  }

  stockTone(stock: number): string {
    if (stock <= 0) return 'danger';
    return 'success';
  }

  productVisibility(product: ProductRecord | number): string {
    const stock = typeof product === 'number' ? product : this.stockValue(product);
    return this.stockTone(stock);
  }

  productVisibilityLabel(product: ProductRecord | number): string {
    const stock = typeof product === 'number' ? product : this.stockValue(product);
    return stock > 0 ? 'Published' : 'Hidden';
  }

  quantityLabel(stock: number): string {
    return new Intl.NumberFormat('en-US').format(Math.max(0, stock));
  }

  priceValue(product: ProductRecord): number {
    return Number(product.price ?? 0);
  }

  stockValue(product: ProductRecord): number {
    return this.stockDrafts()[this.id(product)] ?? Number(product.stock ?? 0);
  }

  pendingDeleteProduct(): ProductRecord | undefined {
    return this.products().find((product) => this.id(product) === this.pendingDeleteId());
  }

  private getApiErrorMessage(error: unknown, fallback: string): string {
    if (!error || typeof error !== 'object') return fallback;

    const apiError = error as {
      error?: { message?: string; details?: string[] };
      message?: string;
    };

    const details = apiError.error?.details?.filter(Boolean) ?? [];
    if (details.length) {
      return details.join(' ');
    }

    return apiError.error?.message || apiError.message || fallback;
  }

  private resolveReferenceLabel(
    value:
      | ProductRecord['category']
      | ProductRecord['subcategory']
      | SubcategoryRecord['category']
      | null
      | undefined,
    namesById: ReadonlyMap<string, string>,
  ): string {
    if (!value) return '';
    if (typeof value !== 'string' && value.name) return value.name;

    const id = this.referenceId(value);
    return namesById.get(id) ?? id;
  }

  private isMongoId(value: string): boolean {
    return /^[a-fA-F0-9]{24}$/.test(value);
  }

  private persistCurrentPage(): void {
    if (typeof window === 'undefined') return;
    window.sessionStorage.setItem(this.storageKey, String(this.currentPage()));
  }

  private readPersistedPage(): number {
    if (typeof window === 'undefined') return 1;

    const value = Number(window.sessionStorage.getItem(this.storageKey) ?? '1');
    return Number.isFinite(value) && value > 0 ? Math.floor(value) : 1;
  }

  private emptyForm(): ProductFormState {
    return {
      id: null,
      name: '',
      description: '',
      price: 0,
      stock: 0,
      category: '',
      subcategory: '',
      images: '',
    };
  }
}
