import { Routes } from '@angular/router';
import { CategoryDetailComponent } from './category-detail/category-detail';
import { CategoriesComponent } from './categories/categories';
import { ProductDetailComponent } from './product-detail/product-detail';
import { ProductsComponent } from './products';
import { SubcategoryDetailComponent } from './subcategory-detail/subcategory-detail';
import { SubcategoriesComponent } from './subcategories/subcategories';

export const PRODUCTS_ROUTES: Routes = [
  { path: 'categories', component: CategoriesComponent },
  { path: 'categories/:id', component: CategoryDetailComponent },
  { path: 'subcategories', component: SubcategoriesComponent },
  { path: 'subcategories/:id', component: SubcategoryDetailComponent },
  { path: ':id', component: ProductDetailComponent },
  { path: '', component: ProductsComponent },
];
