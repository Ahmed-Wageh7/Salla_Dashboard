import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { catchError, forkJoin, of, switchMap } from 'rxjs';
import { AdminApiService } from '../../../core/api/admin-api.service';
import { CategoryRecord, ProductRecord, SubcategoryRecord } from '../../../core/api/admin.models';

@Component({
  selector: 'app-category-detail',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './category-detail.html',
  styleUrls: ['../catalog-detail.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CategoryDetailComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly adminApi = inject(AdminApiService);
  private readonly destroyRef = inject(DestroyRef);

  readonly category = signal<CategoryRecord | null>(null);
  readonly relatedSubcategories = signal<SubcategoryRecord[]>([]);
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
            category: id ? this.adminApi.getCategoryById(id) : of(null),
            subcategories: this.adminApi
              .getSubcategories()
              .pipe(catchError(() => of([] as SubcategoryRecord[]))),
            products: this.adminApi
              .getAdminProducts({ page: 1, limit: 200, sort: '-createdAt' })
              .pipe(catchError(() => of([] as ProductRecord[]))),
          });
        }),
      )
      .subscribe({
        next: ({ category, subcategories, products }) => {
          const categoryId = this.id(category);

          this.category.set(category);
          this.relatedSubcategories.set(
            subcategories.filter(
              (subcategory) => this.subcategoryCategoryId(subcategory) === categoryId,
            ),
          );
          this.relatedProducts.set(
            products.filter((product) => this.referenceId(product.category) === categoryId),
          );
          this.isLoading.set(false);
        },
        error: (error) => {
          this.errorMessage.set(error?.error?.message || 'Unable to load category details.');
          this.isLoading.set(false);
        },
      });
  }

  id(category: CategoryRecord | null): string {
    return category?._id ?? category?.id ?? '';
  }

  subcategoryCategoryId(subcategory: SubcategoryRecord): string {
    return this.referenceId(
      subcategory.category ?? subcategory.categoryId ?? subcategory.category_id ?? '',
    );
  }

  private referenceId(
    value:
      | ProductRecord['category']
      | SubcategoryRecord['category']
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
