import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { catchError, forkJoin, map, of, switchMap } from 'rxjs';
import { AdminApiService } from '../../../core/api/admin-api.service';
import { CategoryRecord, ProductRecord, SubcategoryRecord } from '../../../core/api/admin.models';

@Component({
  selector: 'app-product-detail',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './product-detail.html',
  styleUrls: ['../catalog-detail.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductDetailComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly adminApi = inject(AdminApiService);
  private readonly destroyRef = inject(DestroyRef);

  readonly product = signal<ProductRecord | null>(null);
  readonly categories = signal<CategoryRecord[]>([]);
  readonly subcategories = signal<SubcategoryRecord[]>([]);
  readonly isLoading = signal(true);
  readonly errorMessage = signal('');

  constructor() {
    this.route.paramMap
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        switchMap((params) => {
          const id = params.get('id') ?? '';

          if (!id) {
            return of({
              product: null,
              categories: [] as CategoryRecord[],
              subcategories: [] as SubcategoryRecord[],
            });
          }

          return this.adminApi.getProductById(id).pipe(
            switchMap((product) => {
              const categoryId = this.referenceId(product?.category);
              const subcategoryId = this.referenceId(product?.subcategory);

              return forkJoin({
                product: of(product),
                categories: categoryId
                  ? this.adminApi
                      .getCategoryById(categoryId)
                      .pipe(
                        map((category) => (category ? [category] : [])),
                        catchError(() => of([] as CategoryRecord[])),
                      )
                  : of([] as CategoryRecord[]),
                subcategories: subcategoryId
                  ? this.adminApi
                      .getSubcategoryById(subcategoryId)
                      .pipe(
                        map((subcategory) => (subcategory ? [subcategory] : [])),
                        catchError(() => of([] as SubcategoryRecord[])),
                      )
                  : of([] as SubcategoryRecord[]),
              });
            }),
          );
        }),
      )
      .subscribe({
        next: ({ product, categories, subcategories }) => {
          this.product.set(product);
          this.categories.set(categories);
          this.subcategories.set(subcategories);
          this.isLoading.set(false);
        },
        error: (error) => {
          this.errorMessage.set(error?.error?.message || 'Unable to load product details.');
          this.isLoading.set(false);
        },
      });
  }

  id(product: ProductRecord): string {
    return product._id ?? product.id ?? '';
  }

  categoryId(product: ProductRecord): string {
    return this.referenceId(product.category);
  }

  subcategoryId(product: ProductRecord): string {
    return this.referenceId(product.subcategory);
  }

  categoryLabel(product: ProductRecord): string {
    return this.resolveReferenceLabel(product.category, this.categories());
  }

  subcategoryLabel(product: ProductRecord): string {
    return this.resolveReferenceLabel(product.subcategory, this.subcategories());
  }

  private resolveReferenceLabel(
    value: ProductRecord['category'] | ProductRecord['subcategory'] | null | undefined,
    records: Array<CategoryRecord | SubcategoryRecord>,
  ): string {
    if (!value) return '--';
    if (typeof value !== 'string' && value.name) return value.name;

    const id = this.referenceId(value);
    return records.find((record) => this.referenceId(record) === id)?.name ?? id ?? '--';
  }

  private referenceId(
    value:
      | ProductRecord['category']
      | ProductRecord['subcategory']
      | CategoryRecord
      | SubcategoryRecord
      | null
      | undefined,
  ): string {
    if (!value) return '';
    if (typeof value === 'string') return value;
    return value._id ?? value.id ?? value.name ?? '';
  }
}
