import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { catchError, finalize, map, Observable, of, shareReplay, tap, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  AdminOrderRecord,
  ApiEnvelope,
  CategoryReference,
  CategoryPayload,
  CategoryRecord,
  CheckoutOrderPayload,
  DeductionPayload,
  DeductionRecord,
  ProductPayload,
  ProductRecord,
  SalaryAdjustmentPayload,
  SalaryRecord,
  StaffPayload,
  StaffRecord,
  StaffUpdatePayload,
  SubcategoryPayload,
  SubcategoryRecord,
} from './admin.models';

@Injectable({ providedIn: 'root' })
export class AdminApiService {
  private categoriesCache: CategoryRecord[] | null = null;
  private subcategoriesCache: SubcategoryRecord[] | null = null;
  private categoriesRequest$: Observable<CategoryRecord[]> | null = null;
  private subcategoriesRequest$: Observable<SubcategoryRecord[]> | null = null;

  constructor(private readonly http: HttpClient) {}

  getCategories(forceRefresh = false): Observable<CategoryRecord[]> {
    if (!forceRefresh && this.categoriesCache) {
      return of(this.categoriesCache);
    }

    if (!forceRefresh && this.categoriesRequest$) {
      return this.categoriesRequest$;
    }

    const request$ = this.http
      .get<
        ApiEnvelope<CategoryRecord[] | { items?: CategoryRecord[]; categories?: CategoryRecord[] }>
      >(this.url('/categories'), { headers: this.headers() })
      .pipe(
        map((response) => this.unwrapCollection(response, ['categories'])),
        tap((categories) => {
          this.categoriesCache = categories;
          this.subcategoriesCache = this.deriveSubcategoriesFromCategories(categories);
        }),
        finalize(() => {
          this.categoriesRequest$ = null;
        }),
        shareReplay(1),
      );

    this.categoriesRequest$ = request$;
    return request$;
  }

  createCategory(payload: CategoryPayload): Observable<CategoryRecord> {
    return this.http
      .post<ApiEnvelope<CategoryRecord>>(this.url('/categories'), payload, {
        headers: this.headers(),
      })
      .pipe(
        map((response) => this.unwrap(response)),
        tap(() => this.invalidateCatalogCache()),
      );
  }

  updateCategory(id: string, payload: CategoryPayload): Observable<CategoryRecord> {
    return this.http
      .put<ApiEnvelope<CategoryRecord>>(this.url(`/categories/${id}`), payload, {
        headers: this.headers(),
      })
      .pipe(
        map((response) => this.unwrap(response)),
        tap(() => this.invalidateCatalogCache()),
      );
  }

  deleteCategory(id: string): Observable<void> {
    return this.http
      .delete<ApiEnvelope<unknown>>(this.url(`/categories/${id}`), { headers: this.headers() })
      .pipe(
        map(() => undefined),
        tap(() => this.invalidateCatalogCache()),
      );
  }

  getCategoryById(id: string): Observable<CategoryRecord | null> {
    return this.getCategories().pipe(
      map((categories) => categories.find((category) => this.recordId(category) === id) ?? null),
    );
  }

  getSubcategories(forceRefresh = false): Observable<SubcategoryRecord[]> {
    if (!forceRefresh && this.subcategoriesCache) {
      return of(this.subcategoriesCache);
    }

    if (!forceRefresh && this.subcategoriesRequest$) {
      return this.subcategoriesRequest$;
    }

    const request$ = this.getCategories(forceRefresh).pipe(
      map((categories) => this.deriveSubcategoriesFromCategories(categories)),
      tap((subcategories) => {
        this.subcategoriesCache = subcategories;
      }),
      catchError(() =>
        this.deriveSubcategoriesFromProducts().pipe(
          tap((subcategories) => {
            this.subcategoriesCache = subcategories;
          }),
        ),
      ),
      finalize(() => {
        this.subcategoriesRequest$ = null;
      }),
      shareReplay(1),
    );

    this.subcategoriesRequest$ = request$;
    return request$;
  }

  createSubcategory(payload: SubcategoryPayload): Observable<SubcategoryRecord> {
    return this.http
      .post<ApiEnvelope<SubcategoryRecord>>(this.url('/subcategories'), payload, {
        headers: this.headers(),
      })
      .pipe(
        map((response) => this.unwrap(response)),
        tap(() => this.invalidateCatalogCache()),
      );
  }

  updateSubcategory(id: string, payload: SubcategoryPayload): Observable<SubcategoryRecord> {
    return this.http
      .put<ApiEnvelope<SubcategoryRecord>>(this.url(`/subcategories/${id}`), payload, {
        headers: this.headers(),
      })
      .pipe(
        map((response) => this.unwrap(response)),
        tap(() => this.invalidateCatalogCache()),
      );
  }

  deleteSubcategory(id: string): Observable<void> {
    return this.http
      .delete<ApiEnvelope<unknown>>(this.url(`/subcategories/${id}`), { headers: this.headers() })
      .pipe(
        map(() => undefined),
        tap(() => this.invalidateCatalogCache()),
      );
  }

  getSubcategoryById(id: string): Observable<SubcategoryRecord | null> {
    const cachedSubcategory =
      this.subcategoriesCache?.find((subcategory) => this.recordId(subcategory) === id) ?? null;
    if (cachedSubcategory) {
      return of(cachedSubcategory);
    }

    return this.http
      .get<ApiEnvelope<SubcategoryRecord>>(this.url(`/subcategories/${id}`), {
        headers: this.headers(),
      })
      .pipe(
        map((response) => this.unwrap(response) ?? null),
        catchError((error) =>
          this.deriveSubcategoryByIdFromCategories(id).pipe(
            catchError(() =>
              this.deriveSubcategoryByIdFromProducts(id).pipe(
                catchError(() => throwError(() => error)),
              ),
            ),
          ),
        ),
      );
  }

  getAdminProducts(filters?: {
    page?: number;
    limit?: number;
    minPrice?: number | null;
    maxPrice?: number | null;
    sort?: string;
  }): Observable<ProductRecord[]> {
    let params = new HttpParams();

    if (filters?.page) params = params.set('page', filters.page);
    if (filters?.limit) params = params.set('limit', filters.limit);
    if (filters?.minPrice != null) params = params.set('minPrice', filters.minPrice);
    if (filters?.maxPrice != null) params = params.set('maxPrice', filters.maxPrice);
    if (filters?.sort) params = params.set('sort', filters.sort);

    return this.http
      .get<
        ApiEnvelope<ProductRecord[] | { items?: ProductRecord[]; products?: ProductRecord[] }>
      >(this.url('/products'), { params, headers: this.headers() })
      .pipe(
        map((response) => {
          const payload = this.unwrap(response);

          if (Array.isArray(payload)) return payload;
          if (payload && typeof payload === 'object') {
            return payload.items ?? payload.products ?? [];
          }

          return [];
        }),
      );
  }

  createProduct(payload: ProductPayload): Observable<ProductRecord> {
    return this.http
      .post<ApiEnvelope<ProductRecord>>(this.url('/admin/products'), payload, {
        headers: this.headers(),
      })
      .pipe(map((response) => this.unwrap(response)));
  }

  updateProduct(id: string, payload: ProductPayload): Observable<ProductRecord> {
    return this.http
      .put<ApiEnvelope<ProductRecord>>(this.url(`/admin/products/${id}`), payload, {
        headers: this.headers(),
      })
      .pipe(map((response) => this.unwrap(response)));
  }

  deleteProduct(id: string): Observable<void> {
    return this.http
      .delete<ApiEnvelope<unknown>>(this.url(`/admin/products/${id}`), { headers: this.headers() })
      .pipe(map(() => undefined));
  }

  updateProductStock(id: string, stock: number): Observable<ProductRecord> {
    return this.http
      .patch<
        ApiEnvelope<ProductRecord>
      >(this.url(`/admin/products/${id}/stock`), { stock }, { headers: this.headers() })
      .pipe(map((response) => this.unwrap(response)));
  }

  getProductById(id: string): Observable<ProductRecord | null> {
    return this.http
      .get<ApiEnvelope<ProductRecord>>(this.url(`/products/${id}`), {
        headers: this.headers(),
      })
      .pipe(
        map((response) => this.unwrap(response) ?? null),
        catchError((error) =>
          this.getAdminProducts({ page: 1, limit: 200, sort: '-createdAt' }).pipe(
            map((products) => products.find((product) => this.recordId(product) === id) ?? null),
            catchError(() => throwError(() => error)),
          ),
        ),
      );
  }

  getAdminOrders(): Observable<AdminOrderRecord[]> {
    return this.http
      .get<
        ApiEnvelope<
          AdminOrderRecord[] | { items?: AdminOrderRecord[]; orders?: AdminOrderRecord[] }
        >
      >(this.url('/admin/orders'), { headers: this.headers() })
      .pipe(
        map((response) => {
          const payload = this.unwrap(response);

          if (Array.isArray(payload)) return payload;
          if (payload && typeof payload === 'object') {
            return payload.items ?? payload.orders ?? [];
          }

          return [];
        }),
      );
  }

  updateOrderStatus(id: string, status: string): Observable<AdminOrderRecord> {
    return this.http
      .patch<
        ApiEnvelope<AdminOrderRecord>
      >(this.url(`/admin/orders/${id}/status`), { orderStatus: status }, { headers: this.headers() })
      .pipe(map((response) => this.unwrap(response)));
  }

  createOrder(payload: CheckoutOrderPayload): Observable<AdminOrderRecord> {
    return this.http
      .post<ApiEnvelope<AdminOrderRecord>>(this.url('/orders/checkout'), payload, {
        headers: this.headers(),
      })
      .pipe(map((response) => this.unwrap(response)));
  }

  getAdminOrderById(id: string): Observable<AdminOrderRecord> {
    return this.http
      .get<ApiEnvelope<AdminOrderRecord>>(this.url(`/admin/orders/${id}`), {
        headers: this.headers(),
      })
      .pipe(map((response) => this.unwrap(response)));
  }

  checkIn(): Observable<unknown> {
    return this.http
      .post<ApiEnvelope<unknown>>(this.url('/staff/checkin'), {}, { headers: this.headers() })
      .pipe(map((response) => this.unwrap(response)));
  }

  checkOut(): Observable<unknown> {
    return this.http
      .post<ApiEnvelope<unknown>>(this.url('/staff/checkout'), {}, { headers: this.headers() })
      .pipe(map((response) => this.unwrap(response)));
  }

  getAdminStaff(): Observable<StaffRecord[]> {
    return this.http
      .get<ApiEnvelope<StaffRecord[] | { items?: StaffRecord[]; staff?: StaffRecord[] }>>(
        this.url('/admin/staff'),
        { headers: this.headers() },
      )
      .pipe(
        map((response) => {
          const payload = this.unwrap(response);

          if (Array.isArray(payload)) return payload;
          if (payload && typeof payload === 'object') {
            return payload.items ?? payload.staff ?? [];
          }

          return [];
        }),
      );
  }

  getAdminStaffById(id: string): Observable<StaffRecord> {
    return this.http
      .get<ApiEnvelope<StaffRecord>>(this.url(`/admin/staff/${id}`), {
        headers: this.headers(),
      })
      .pipe(map((response) => this.unwrap(response)));
  }

  createStaff(payload: StaffPayload): Observable<StaffRecord> {
    return this.http
      .post<ApiEnvelope<StaffRecord>>(this.url('/admin/staff'), payload, {
        headers: this.headers(),
      })
      .pipe(map((response) => this.unwrap(response)));
  }

  updateStaff(id: string, payload: StaffUpdatePayload): Observable<StaffRecord> {
    return this.http
      .put<ApiEnvelope<StaffRecord>>(this.url(`/admin/staff/${id}`), payload, {
        headers: this.headers(),
      })
      .pipe(map((response) => this.unwrap(response)));
  }

  deleteStaff(id: string): Observable<void> {
    return this.http
      .delete<ApiEnvelope<unknown>>(this.url(`/admin/staff/${id}`), { headers: this.headers() })
      .pipe(map(() => undefined));
  }

  getDeductions(staffId: string): Observable<DeductionRecord[]> {
    return this.http
      .get<
        ApiEnvelope<
          DeductionRecord[] | { items?: DeductionRecord[]; deductions?: DeductionRecord[] }
        >
      >(this.url(`/admin/staff/${staffId}/deductions`), { headers: this.headers() })
      .pipe(
        map((response) => {
          const payload = this.unwrap(response);

          if (Array.isArray(payload)) return payload;
          if (payload && typeof payload === 'object') {
            return payload.items ?? payload.deductions ?? [];
          }

          return [];
        }),
      );
  }

  addDeduction(staffId: string, payload: DeductionPayload): Observable<DeductionRecord> {
    return this.http
      .post<ApiEnvelope<DeductionRecord>>(this.url(`/admin/staff/${staffId}/deductions`), payload, {
        headers: this.headers(),
      })
      .pipe(map((response) => this.unwrap(response)));
  }

  updateDeduction(
    staffId: string,
    deductionId: string,
    payload: DeductionPayload,
  ): Observable<DeductionRecord> {
    return this.http
      .put<
        ApiEnvelope<DeductionRecord>
      >(this.url(`/admin/staff/${staffId}/deductions/${deductionId}`), payload, { headers: this.headers() })
      .pipe(map((response) => this.unwrap(response)));
  }

  deleteDeduction(staffId: string, deductionId: string): Observable<void> {
    return this.http
      .delete<ApiEnvelope<unknown>>(this.url(`/admin/staff/${staffId}/deductions/${deductionId}`), {
        headers: this.headers(),
      })
      .pipe(map(() => undefined));
  }

  getSalary(staffId: string, month: string): Observable<SalaryRecord | null> {
    return this.http
      .get<ApiEnvelope<SalaryRecord>>(this.url(`/admin/staff/${staffId}/salary/${month}`), {
        headers: this.headers(),
      })
      .pipe(map((response) => this.unwrap(response) ?? null));
  }

  paySalary(staffId: string, month: string): Observable<SalaryRecord | null> {
    return this.http
      .post<
        ApiEnvelope<SalaryRecord>
      >(this.url(`/admin/staff/${staffId}/salary/${month}/pay`), {}, { headers: this.headers() })
      .pipe(map((response) => this.unwrap(response) ?? null));
  }

  adjustSalary(
    staffId: string,
    month: string,
    payload: SalaryAdjustmentPayload,
  ): Observable<SalaryRecord | null> {
    return this.http
      .put<
        ApiEnvelope<SalaryRecord>
      >(this.url(`/admin/staff/${staffId}/salary/${month}/adjust`), payload, { headers: this.headers() })
      .pipe(map((response) => this.unwrap(response) ?? null));
  }

  private url(path: string): string {
    const runtimeBaseUrl = this.getRuntimeBaseUrl();
    const baseUrl = runtimeBaseUrl || environment.apiBaseUrl;

    return `${baseUrl}${path}`;
  }

  private getRuntimeBaseUrl(): string {
    if (typeof window === 'undefined') return '';

    const runtimeBaseUrl = window.localStorage.getItem('api_base_url')?.trim() ?? '';
    if (!runtimeBaseUrl) return '';

    // Ignore stale localhost overrides when the app is running on a deployed host.
    if (!this.isLocalAppHost() && this.isLoopbackUrl(runtimeBaseUrl)) {
      window.localStorage.removeItem('api_base_url');
      return '';
    }

    return runtimeBaseUrl.replace(/\/+$/, '');
  }

  private isLocalAppHost(): boolean {
    if (typeof window === 'undefined') return false;

    return ['localhost', '127.0.0.1'].includes(window.location.hostname);
  }

  private isLoopbackUrl(value: string): boolean {
    try {
      const parsed = new URL(value);
      return ['localhost', '127.0.0.1'].includes(parsed.hostname);
    } catch {
      return false;
    }
  }

  private headers(): HttpHeaders {
    const token = this.getToken();

    return token
      ? new HttpHeaders({
          Authorization: `Bearer ${token}`,
        })
      : new HttpHeaders();
  }

  private getToken(): string {
    if (typeof window === 'undefined') return '';

    return (
      window.localStorage.getItem('auth_token') ||
      window.localStorage.getItem('access_token') ||
      window.localStorage.getItem('token') ||
      ''
    );
  }

  private unwrap<T>(response: ApiEnvelope<T> | T): T {
    if (response && typeof response === 'object' && !Array.isArray(response)) {
      const envelope = response as ApiEnvelope<T>;

      if (envelope.data !== undefined) return envelope.data;
      if (envelope.results !== undefined) return envelope.results;
      if (envelope.items !== undefined) return envelope.items;
      if (envelope.order !== undefined) return envelope.order;
      if (envelope.orders !== undefined) return envelope.orders;
      if (envelope.product !== undefined) return envelope.product;
      if (envelope.category !== undefined) return envelope.category;
      if (envelope.subcategory !== undefined) return envelope.subcategory;
      if (envelope.staff !== undefined) return envelope.staff;
    }

    return response as T;
  }

  private unwrapCollection<T>(
    response: ApiEnvelope<T[] | Record<string, unknown>> | T[] | Record<string, unknown>,
    keys: string[] = [],
  ): T[] {
    const payload = this.unwrap(response as ApiEnvelope<T[] | Record<string, unknown>>);

    if (Array.isArray(payload)) {
      return payload;
    }

    if (payload && typeof payload === 'object') {
      for (const key of ['items', ...keys]) {
        const candidate = (payload as Record<string, unknown>)[key];
        if (Array.isArray(candidate)) {
          return candidate as T[];
        }
      }
    }

    return [];
  }

  private deriveSubcategoriesFromProducts(): Observable<SubcategoryRecord[]> {
    return this.getAdminProducts({ page: 1, limit: 200, sort: 'name' }).pipe(
      map((products) => {
        const uniqueSubcategories = new Map<string, SubcategoryRecord>();

        for (const product of products) {
          const subcategoryId = this.referenceId(product.subcategory);
          if (!subcategoryId) continue;

          const subcategory =
            typeof product.subcategory === 'string'
              ? ({ id: subcategoryId, name: subcategoryId } satisfies SubcategoryRecord)
              : {
                  _id: product.subcategory?._id,
                  id: product.subcategory?.id ?? subcategoryId,
                  name: product.subcategory?.name ?? subcategoryId,
                };

          uniqueSubcategories.set(subcategoryId, {
            ...subcategory,
            category:
              typeof product.category === 'string'
                ? product.category
                : {
                    _id: product.category?._id,
                    id: product.category?.id,
                    name: product.category?.name,
                  },
          });
        }

        return [...uniqueSubcategories.values()];
      }),
    );
  }

  private deriveSubcategoriesFromCategories(categories: CategoryRecord[]): SubcategoryRecord[] {
    const uniqueSubcategories = new Map<string, SubcategoryRecord>();

    for (const category of categories) {
      const categoryId = this.recordId(category);
      const categoryReference = {
        _id: category._id,
        id: category.id ?? categoryId,
        name: category.name,
      } satisfies CategoryReference;

      for (const subcategory of category.subcategories ?? []) {
        const subcategoryId = this.recordId(subcategory);
        if (!subcategoryId) continue;

        uniqueSubcategories.set(subcategoryId, {
          ...subcategory,
          id: subcategory.id ?? subcategoryId,
          category:
            typeof subcategory.category === 'string' && subcategory.category
              ? subcategory.category
              : categoryReference,
        });
      }
    }

    return [...uniqueSubcategories.values()];
  }

  private deriveSubcategoryByIdFromCategories(id: string): Observable<SubcategoryRecord | null> {
    return this.getCategories().pipe(
      map((categories) =>
        this.deriveSubcategoriesFromCategories(categories).find(
          (subcategory) => this.recordId(subcategory) === id,
        ) ?? null,
      ),
    );
  }

  private deriveSubcategoryByIdFromProducts(id: string): Observable<SubcategoryRecord | null> {
    return this.deriveSubcategoriesFromProducts().pipe(
      map(
        (subcategories) =>
          subcategories.find((subcategory) => this.recordId(subcategory) === id) ?? null,
      ),
    );
  }

  private invalidateCatalogCache(): void {
    this.categoriesCache = null;
    this.subcategoriesCache = null;
    this.categoriesRequest$ = null;
    this.subcategoriesRequest$ = null;
  }

  private isNotFoundError(error: unknown): boolean {
    if (!error || typeof error !== 'object') return false;

    const apiError = error as {
      status?: number;
      error?: { message?: string };
      message?: string;
    };

    const message = apiError.error?.message ?? apiError.message ?? '';
    return apiError.status === 404 || /not found/i.test(message);
  }

  private recordId(record: { _id?: string; id?: string } | null | undefined): string {
    return record?._id ?? record?.id ?? '';
  }

  private referenceId(
    value: ProductRecord['category'] | ProductRecord['subcategory'] | string | null | undefined,
  ): string {
    if (!value) return '';
    if (typeof value === 'string') return value;
    return value._id ?? value.id ?? value.name ?? '';
  }
}
