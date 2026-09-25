export interface Product {
  id: string;
  name: string;
  category: 'bitki' | 'quş' | 'digər';
  price: number;
  unit: string;
  image: string;
  description: string;
  stock: number;
  createdAt?: any;
  sellerId?: string;
  sellerPhone?: string;
  status?: 'approved' | 'pending' | 'rejected';
}

export interface UserSale {
  id: string;
  orderNumber: string;
  userId: string;
  userName: string;
  userEmail: string;
  phone: string;
  name: string;
  category: 'bitki' | 'quş' | 'digər';
  price: number;
  unit: string;
  image?: string; // base64 or URL
  description: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: any;
}

export interface NavItem {
  label: string;
  icon: string;
  id: string;
}
