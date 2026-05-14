import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { catchError, forkJoin, of, switchMap } from 'rxjs';
import { AdminApiService } from '../../../core/api/admin-api.service';
import { CategoryRecord, ProductRecord, SubcategoryRecord } from '../../../core/api/admin.models';

@Component({
  selector: 'app-subcategory-detail',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './subcategory-detail.html',
  styleUrls: ['../catalog-detail.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SubcategoryDetailComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly adminApi = inject(AdminApiService);
  private readonly destroyRef = inject(DestroyRef);

  readonly subcategory = signal<SubcategoryRecord | null>(null);
  readonly categories = signal<CategoryRecord[]>([]);
  readonly relatedProducts = signal<ProductRecord[]>([]);
  readonly isLoading = signal(true);
  readonly errorMessage = signal('');

  constructor() {
    this.route.paramMap
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        switchMap((params) => {
          const id = params.get('id') ?? '';

          return forkJoin({
            subcategory: id ? this.adminApi.getSubcategoryById(id) : of(null),
            categories: this.adminApi
              .getCategories()
              .pipe(catchError(() => of([] as CategoryRecord[]))),
            products: this.adminApi
              .getAdminProducts({ page: 1, limit: 200, sort: '-createdAt' })
              .pipe(catchError(() => of([] as ProductRecord[]))),
          });
        }),
      )
      .subscribe({
        next: ({ subcategory, categories, products }) => {
          const subcategoryId = this.id(subcategory);

          this.subcategory.set(subcategory);
          this.categories.set(categories);
          this.relatedProducts.set(
            products.filter((product) => this.referenceId(product.subcategory) === subcategoryId),
          );
          this.isLoading.set(false);
        },
        error: (error) => {
          this.errorMessage.set(error?.error?.message || 'Unable to load subcategory details.');
          this.isLoading.set(false);
        },
      });
  }

  id(subcategory: SubcategoryRecord | null): string {
    return subcategory?._id ?? subcategory?.id ?? '';
  }

  categoryId(subcategory: SubcategoryRecord): string {
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

    const categoryId = this.categoryId(subcategory);
    return (
      this.categories().find((category) => this.referenceId(category) === categoryId)?.name ??
      categoryId
    );
  }

  private referenceId(
    value:
      | ProductRecord['subcategory']
      | SubcategoryRecord['category']
      | CategoryRecord
      | string
      | { _id?: string; id?: string; name?: string }
      | null
      | undefined,
  ): string {
    if (!value) return '';
    if (typeof value === 'string') return value;
    return value._id ?? value.id ?? value.name ?? '';
  }
}
