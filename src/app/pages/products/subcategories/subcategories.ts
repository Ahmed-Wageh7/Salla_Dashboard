import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { catchError, forkJoin, of } from 'rxjs';
import { AdminApiService } from '../../../core/api/admin-api.service';
import { AuditLogService } from '../../../services/audit-log.service';
import { CanDisableDirective } from '../../../shared/access/can-disable.directive';
import {
  CategoryRecord,
  SubcategoryPayload,
  SubcategoryRecord,
} from '../../../core/api/admin.models';
import { ToastService } from '../../../shared/toast/toast.service';

interface SubcategoryFormState {
  id: string | null;
  name: string;
  description: string;
  category: string;
}

@Component({
  selector: 'app-subcategories',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, CanDisableDirective],
  templateUrl: './subcategories.html',
  styleUrls: ['../catalog-admin.scss', '../products.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SubcategoriesComponent {
  private readonly adminApi = inject(AdminApiService);
  private readonly auditLogService = inject(AuditLogService);
  private readonly toastService = inject(ToastService);

  readonly categories = signal<CategoryRecord[]>([]);
  readonly subcategories = signal<SubcategoryRecord[]>([]);
  readonly isLoading = signal(true);
  readonly isSaving = signal(false);
  readonly isDeleting = signal(false);
  readonly errorMessage = signal('');
  readonly searchQuery = signal('');
  readonly categoryFilter = signal('all');
  readonly isFormModalOpen = signal(false);
  readonly isDeleteModalOpen = signal(false);
  readonly pendingDeleteId = signal<string | null>(null);
  readonly form = signal<SubcategoryFormState>(this.emptyForm());
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

  readonly filteredSubcategories = computed(() => {
    const query = this.searchQuery().trim().toLowerCase();
    const categoryFilter = this.categoryFilter();

    return this.subcategories().filter((subcategory) => {
      const matchesCategory =
        categoryFilter === 'all' || this.subcategoryCategoryId(subcategory) === categoryFilter;
      const matchesQuery =
        !query ||
        [
          subcategory.name,
          subcategory.description ?? '',
          this.categoryLabel(subcategory),
          this.id(subcategory),
        ]
          .join(' ')
          .toLowerCase()
          .includes(query);

      return matchesCategory && matchesQuery;
    });
  });

  constructor() {
    this.loadData();
  }

  loadData(): void {
    this.isLoading.set(true);
    this.errorMessage.set('');

    let loadError = '';

    forkJoin({
      categories: this.adminApi.getCategories().pipe(
        catchError((error) => {
          loadError ||= this.getApiErrorMessage(error, 'Unable to load categories.');
          return of([] as CategoryRecord[]);
        }),
      ),
      subcategories: this.adminApi.getSubcategories().pipe(
        catchError((error) => {
          loadError ||= this.getApiErrorMessage(error, 'Unable to load subcategories.');
          return of([] as SubcategoryRecord[]);
        }),
      ),
    }).subscribe(({ categories, subcategories }) => {
      this.categories.set(
        [...categories].sort((left, right) => left.name.localeCompare(right.name)),
      );
      this.subcategories.set(this.sortSubcategories(subcategories));

      if (loadError) {
        this.errorMessage.set(loadError);
        this.toastService.error(loadError);
      }

      this.isLoading.set(false);
    });
  }

  updateSearch(query: string): void {
    this.searchQuery.set(query);
  }

  openCreateModal(): void {
    this.errorMessage.set('');
    this.form.set(this.emptyForm());
    this.isFormModalOpen.set(true);
  }

  selectSubcategory(subcategory: SubcategoryRecord): void {
    this.form.set({
      id: this.id(subcategory),
      name: subcategory.name ?? '',
      description: subcategory.description ?? '',
      category: this.subcategoryCategoryId(subcategory),
    });
    this.errorMessage.set('');
    this.isFormModalOpen.set(true);
  }

  closeFormModal(): void {
    this.form.set(this.emptyForm());
    this.isFormModalOpen.set(false);
  }

  updateForm<K extends keyof SubcategoryFormState>(key: K, value: SubcategoryFormState[K]): void {
    this.form.update((current) => ({ ...current, [key]: value }));
  }

  saveSubcategory(): void {
    const form = this.form();
    const payload: SubcategoryPayload = {
      name: form.name.trim(),
      description: form.description.trim(),
      category: form.category.trim(),
    };

    if (!payload.name || !payload.category) {
      const message = 'Subcategory name and category are required.';
      this.errorMessage.set(message);
      this.toastService.error(message);
      return;
    }

    this.isSaving.set(true);
    this.errorMessage.set('');

    const request = form.id
      ? this.adminApi.updateSubcategory(form.id, payload)
      : this.adminApi.createSubcategory(payload);

    request.subscribe({
      next: (subcategory) => {
        const normalizedSubcategory = this.normalizeSubcategory(subcategory, payload.category);
        this.auditLogService.log({
          action: form.id ? 'Subcategory Updated' : 'Subcategory Created',
          entityType: 'subcategory',
          entityId: this.id(normalizedSubcategory),
          summary: `Subcategory "${payload.name}" was ${form.id ? 'updated' : 'created'}.`,
        });

        this.subcategories.update((current) => {
          const existingIndex = current.findIndex(
            (entry) => this.id(entry) === this.id(normalizedSubcategory),
          );

          if (existingIndex === -1) {
            return this.sortSubcategories([...current, normalizedSubcategory]);
          }

          const next = [...current];
          next[existingIndex] = {
            ...next[existingIndex],
            ...normalizedSubcategory,
          };
          return this.sortSubcategories(next);
        });

        this.toastService.success(
          form.id ? 'Subcategory updated successfully.' : 'Subcategory created successfully.',
        );
        this.closeFormModal();
        this.isSaving.set(false);
      },
      error: (error) => {
        const message = this.getApiErrorMessage(error, 'Unable to save subcategory.');
        this.errorMessage.set(message);
        this.toastService.error(message);
        this.isSaving.set(false);
      },
    });
  }

  requestDelete(subcategory: SubcategoryRecord): void {
    this.pendingDeleteId.set(this.id(subcategory));
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

    this.adminApi.deleteSubcategory(id).subscribe({
      next: () => {
        this.auditLogService.log({
          action: 'Subcategory Deleted',
          entityType: 'subcategory',
          entityId: id,
          summary: `Subcategory ${id} was deleted.`,
          status: 'warning',
        });
        this.subcategories.update((current) =>
          current.filter((subcategory) => this.id(subcategory) !== id),
        );
        this.toastService.success('Subcategory deleted successfully.');
        if (this.form().id === id) {
          this.closeFormModal();
        }
        this.closeDeleteModal();
        this.isDeleting.set(false);
      },
      error: (error) => {
        const message = this.getApiErrorMessage(error, 'Unable to delete subcategory.');
        this.errorMessage.set(message);
        this.toastService.error(message);
        this.isDeleting.set(false);
      },
    });
  }

  pendingDeleteSubcategory(): SubcategoryRecord | undefined {
    return this.subcategories().find(
      (subcategory) => this.id(subcategory) === this.pendingDeleteId(),
    );
  }

  id(subcategory: SubcategoryRecord): string {
    return subcategory._id ?? subcategory.id ?? '';
  }

  categoryId(category: CategoryRecord): string {
    return category._id ?? category.id ?? '';
  }

  subcategoryCategoryId(subcategory: SubcategoryRecord): string {
    return this.referenceId(
      subcategory.category ?? subcategory.categoryId ?? subcategory.category_id ?? '',
    );
  }

  categoryLabel(subcategory: SubcategoryRecord): string {
    if (
      subcategory.category &&
      typeof subcategory.category !== 'string' &&
      subcategory.category.name
    ) {
      return subcategory.category.name;
    }

    const categoryId = this.subcategoryCategoryId(subcategory);
    return this.categoryNameById().get(categoryId) ?? categoryId;
  }

  private normalizeSubcategory(
    subcategory: SubcategoryRecord,
    fallbackCategoryId: string,
  ): SubcategoryRecord {
    const categoryId =
      this.referenceId(
        subcategory.category ?? subcategory.categoryId ?? subcategory.category_id ?? '',
      ) || fallbackCategoryId;
    const category = this.categories().find((entry) => this.categoryId(entry) === categoryId);

    return {
      ...subcategory,
      id: subcategory.id ?? subcategory._id,
      category:
        subcategory.category && typeof subcategory.category !== 'string'
          ? subcategory.category
          : category
            ? {
                _id: category._id,
                id: category.id ?? category._id,
                name: category.name,
              }
            : categoryId,
      categoryId,
    };
  }

  private referenceId(
    value: string | { _id?: string; id?: string; name?: string } | null | undefined,
  ): string {
    if (!value) return '';
    if (typeof value === 'string') return value;
    return value._id ?? value.id ?? value.name ?? '';
  }

  private getApiErrorMessage(error: unknown, fallback: string): string {
    if (!error || typeof error !== 'object') return fallback;

    const apiError = error as {
      error?: { message?: string; details?: string[] };
      message?: string;
    };

    return (
      apiError.error?.details?.join(' ') || apiError.error?.message || apiError.message || fallback
    );
  }

  private emptyForm(): SubcategoryFormState {
    return {
      id: null,
      name: '',
      description: '',
      category: '',
    };
  }

  private sortSubcategories(subcategories: SubcategoryRecord[]): SubcategoryRecord[] {
    return [...subcategories].sort((left, right) => left.name.localeCompare(right.name));
  }
}
