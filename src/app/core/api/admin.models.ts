export interface ApiEnvelope<T> {
  success?: boolean;
  message?: string;
  data?: T;
  results?: T;
  items?: T;
  order?: T;
  orders?: T;
  product?: T;
  category?: T;
  subcategory?: T;
  categories?: T;
  subcategories?: T;
  staff?: T;
}

export interface CategoryReference {
  _id?: string;
  id?: string;
  name?: string;
}

export interface CategoryRecord {
  _id?: string;
  id?: string;
  name: string;
  description?: string;
  subcategories?: SubcategoryRecord[];
  createdAt?: string;
  updatedAt?: string;
}

export interface SubcategoryRecord {
  _id?: string;
  id?: string;
  name: string;
  description?: string;
  category?: string | CategoryReference;
  categoryId?: string;
  category_id?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ProductRecord {
  _id?: string;
  id?: string;
  name: string;
  description?: string;
  price: number;
  stock: number;
  category?: string | CategoryReference;
  subcategory?: string | CategoryReference;
  images?: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface AdminOrderRecord {
  _id?: string;
  id?: string;
  orderNumber?: string | number;
  source?: string;
  user?: string | { _id?: string; id?: string; name?: string; phone?: string; email?: string };
  customer?: { name?: string; phone?: string; email?: string };
  paymentMethod?: string;
  paymentStatus?: string;
  currency?: string;
  shipping?: string;
  tags?: string[];
  shippingAddress?: {
    street?: string;
    city?: string;
    country?: string;
    postalCode?: string;
  };
  totalPrice?: number;
  totalAmount?: number;
  total?: number;
  orderStatus?: string;
  status?: string;
  items?: Array<
    | string
    | {
        name?: string;
        title?: string;
        productName?: string;
        product?: string | { name?: string; title?: string };
      }
  >;
  createdAt?: string;
  updatedAt?: string;
}

export interface CheckoutOrderPayload {
  paymentMethod: string;
  shippingAddress: {
    street: string;
    city: string;
    country: string;
    postalCode: string;
  };
}

export interface DeductionRecord {
  _id?: string;
  id?: string;
  month: string;
  amount: number;
  reason: string;
  date: string;
}

export interface SalaryRecord {
  _id?: string;
  id?: string;
  month?: string;
  amount?: number;
  total?: number;
  baseSalary?: number;
  deductions?: number;
  paid?: boolean;
  paidAt?: string;
  [key: string]: unknown;
}

export interface StaffUserRecord {
  _id?: string;
  id?: string;
  name?: string;
  email?: string;
}

export interface StaffRecord {
  _id?: string;
  id?: string;
  user?: string | StaffUserRecord;
  dailySalary: number;
  joinDate: string;
  department: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface ProductPayload {
  name: string;
  description: string;
  price: number;
  stock: number;
  category: string;
  subcategory: string;
  images: string[];
}

export interface CategoryPayload {
  name: string;
  description: string;
}

export interface SubcategoryPayload {
  name: string;
  description: string;
  category: string;
}

export interface DeductionPayload {
  month: string;
  amount: number;
  reason: string;
  date: string;
}

export interface SalaryAdjustmentPayload {
  finalSalary: number;
  reason?: string;
}

export interface StaffPayload {
  user: string;
  dailySalary: number;
  joinDate: string;
  department: string;
  isActive: boolean;
}

export type StaffUpdatePayload = Partial<StaffPayload>;
