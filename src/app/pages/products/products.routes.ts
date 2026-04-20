import { Routes } from '@angular/router';
import { CategoryDetailComponent } from './category-detail/category-detail';
import { CategoriesComponent } from './categories/categories';
import { ProductDetailComponent } from './product-detail/product-detail';
import { ProductsComponent } from './products';
import { SubcategoryDetailComponent } from './subcategory-detail/subcategory-detail';
import { SubcategoriesComponent } from './subcategories/subcategories';

export const PRODUCTS_ROUTES: Routes = [
  { path: 'categories', component: CategoriesComponent, title: 'Categories | Salla Dashboard' },
  { path: 'categories/:id', component: CategoryDetailComponent, title: 'Category Details | Salla Dashboard' },
  { path: 'subcategories', component: SubcategoriesComponent, title: 'Subcategories | Salla Dashboard' },
  { path: 'subcategories/:id', component: SubcategoryDetailComponent, title: 'Subcategory Details | Salla Dashboard' },
  { path: ':id', component: ProductDetailComponent, title: 'Product Details | Salla Dashboard' },
  { path: '', component: ProductsComponent, title: 'Products | Salla Dashboard' },
];
