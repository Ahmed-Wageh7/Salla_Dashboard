import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { AdminApiService } from '../../../core/api/admin-api.service';
import { CategoryPayload, CategoryRecord } from '../../../core/api/admin.models';
import { ToastService } from '../../../shared/toast/toast.service';

interface CategoryFormState {
  id: string | null;
  name: string;
  description: string;
}

@Component({
  selector: 'app-categories',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './categories.html',
  styleUrls: ['../catalog-admin.scss', '../products.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CategoriesComponent {
  private readonly adminApi = inject(AdminApiService);
  private readonly toastService = inject(ToastService);

  readonly categories = signal<CategoryRecord[]>([]);
  readonly isLoading = signal(true);
  readonly isSaving = signal(false);
  readonly isDeleting = signal(false);
  readonly errorMessage = signal('');
  readonly searchQuery = signal('');
  readonly isFormModalOpen = signal(false);
  readonly isDeleteModalOpen = signal(false);
  readonly pendingDeleteId = signal<string | null>(null);
  readonly form = signal<CategoryFormState>(this.emptyForm());

  readonly filteredCategories = computed(() => {
    const query = this.searchQuery().trim().toLowerCase();
    if (!query) return this.categories();

    return this.categories().filter((category) =>
      [category.name, category.description ?? '', this.id(category)]
        .join(' ')
        .toLowerCase()
        .includes(query),
    );
  });

  constructor() {
    this.loadCategories();
  }

  loadCategories(): void {
    this.isLoading.set(true);
    this.errorMessage.set('');

    this.adminApi.getCategories().subscribe({
      next: (categories) => {
        this.categories.set(
          [...categories].sort((left, right) => left.name.localeCompare(right.name)),
        );
        this.isLoading.set(false);
      },
      error: (error) => {
        const message = this.getApiErrorMessage(error, 'Unable to load categories.');
        this.errorMessage.set(message);
        this.toastService.error(message);
        this.isLoading.set(false);
      },
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

  selectCategory(category: CategoryRecord): void {
    this.form.set({
      id: this.id(category),
      name: category.name ?? '',
      description: category.description ?? '',
    });
    this.errorMessage.set('');
    this.isFormModalOpen.set(true);
  }

  closeFormModal(): void {
    this.form.set(this.emptyForm());
    this.isFormModalOpen.set(false);
  }

  updateForm<K extends keyof CategoryFormState>(key: K, value: CategoryFormState[K]): void {
    this.form.update((current) => ({ ...current, [key]: value }));
  }

  saveCategory(): void {
    const form = this.form();
    const payload: CategoryPayload = {
      name: form.name.trim(),
      description: form.description.trim(),
    };

    if (!payload.name) {
      const message = 'Category name is required.';
      this.errorMessage.set(message);
      this.toastService.error(message);
      return;
    }

    this.isSaving.set(true);
    this.errorMessage.set('');

    const request = form.id
      ? this.adminApi.updateCategory(form.id, payload)
      : this.adminApi.createCategory(payload);

    request.subscribe({
      next: () => {
        this.toastService.success(
          form.id ? 'Category updated successfully.' : 'Category created successfully.',
        );
        this.closeFormModal();
        this.loadCategories();
        this.isSaving.set(false);
      },
      error: (error) => {
        const message = this.getApiErrorMessage(error, 'Unable to save category.');
        this.errorMessage.set(message);
        this.toastService.error(message);
        this.isSaving.set(false);
      },
    });
  }

  requestDelete(category: CategoryRecord): void {
    this.pendingDeleteId.set(this.id(category));
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

    this.adminApi.deleteCategory(id).subscribe({
      next: () => {
        this.toastService.success('Category deleted successfully.');
        if (this.form().id === id) {
          this.closeFormModal();
        }
        this.closeDeleteModal();
        this.loadCategories();
        this.isDeleting.set(false);
      },
      error: (error) => {
        const message = this.getApiErrorMessage(error, 'Unable to delete category.');
        this.errorMessage.set(message);
        this.toastService.error(message);
        this.isDeleting.set(false);
      },
    });
  }

  pendingDeleteCategory(): CategoryRecord | undefined {
    return this.categories().find((category) => this.id(category) === this.pendingDeleteId());
  }

  id(category: CategoryRecord): string {
    return category._id ?? category.id ?? '';
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

  private emptyForm(): CategoryFormState {
    return {
      id: null,
      name: '',
      description: '',
    };
  }
}
