import { Routes } from '@angular/router';
import { CategoryDetailComponent } from './category-detail/category-detail';
import { CategoriesComponent } from './categories/categories';
import { ProductDetailComponent } from './product-detail/product-detail';
import { ProductsComponent } from './products';
import { SubcategoryDetailComponent } from './subcategory-detail/subcategory-detail';
import { SubcategoriesComponent } from './subcategories/subcategories';

export const PRODUCTS_ROUTES: Routes = [
  { path: 'categories', component: CategoriesComponent, data: { titleKey: 'routes.categories' } },
  {
    path: 'categories/:id',
    component: CategoryDetailComponent,
    data: { titleKey: 'routes.categoryDetails' },
  },
  { path: 'subcategories', component: SubcategoriesComponent, data: { titleKey: 'routes.subcategories' } },
  {
    path: 'subcategories/:id',
    component: SubcategoryDetailComponent,
    data: { titleKey: 'routes.subcategoryDetails' },
  },
  { path: ':id', component: ProductDetailComponent, data: { titleKey: 'routes.productDetails' } },
  { path: '', component: ProductsComponent, data: { titleKey: 'routes.products' } },
];
