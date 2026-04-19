import { TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';

import { CategoryDetailComponent } from './category-detail/category-detail';
import { CategoriesComponent } from './categories/categories';
import { ProductDetailComponent } from './product-detail/product-detail';
import { ProductsComponent } from './products';
import { SubcategoryDetailComponent } from './subcategory-detail/subcategory-detail';
import { SubcategoriesComponent } from './subcategories/subcategories';

describe('Catalog pages', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        ProductsComponent,
        CategoriesComponent,
        SubcategoriesComponent,
        ProductDetailComponent,
        CategoryDetailComponent,
        SubcategoryDetailComponent,
      ],
      providers: [provideNoopAnimations()],
    }).compileComponents();
  });

  it('compiles the updated catalog screens', () => {
    expect(true).toBe(true);
  });
});
