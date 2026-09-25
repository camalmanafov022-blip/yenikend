import { Product } from './types';

export const PRODUCTS: Product[] = [
  {
    id: '1',
    name: 'Pomidor Şitili (Zirə)',
    category: 'bitki',
    price: 0.50,
    unit: 'ədəd',
    image: 'https://images.unsplash.com/photo-1592841200221-a6898f307baa?auto=format&fit=crop&q=80&w=400',
    description: 'Yüksək məhsuldar, yerli Zirə sortu.',
    stock: 500
  },
  {
    id: '2',
    name: 'Kənd Toyuğu (Loman Braun)',
    category: 'quş',
    price: 12.00,
    unit: 'ədəd',
    image: 'https://images.unsplash.com/photo-1548550023-2bdb3c5beed7?auto=format&fit=crop&q=80&w=400',
    description: 'Gündəlik yumurta verən, sağlam cins.',
    stock: 50
  },
  {
    id: '3',
    name: 'Üzvi Gübrə (Biohumus)',
    category: 'digər',
    price: 5.00,
    unit: 'kq',
    image: 'https://images.unsplash.com/photo-1628352081506-83c43123ed6d?auto=format&fit=crop&q=80&w=400',
    description: 'Torpağın bərpası üçün tam təbii gübrə.',
    stock: 100
  },
  {
    id: '4',
    name: 'Böyük Ağ Hinduşka',
    category: 'quş',
    price: 45.00,
    unit: 'ədəd',
    image: 'https://images.unsplash.com/photo-1615551043360-33de8b5f410c?auto=format&fit=crop&q=80&w=800',
    description: 'Ətlik cins, sürətli böyüyən.',
    stock: 20
  },
  {
    id: '5',
    name: 'Alma Şitili (Qızıləhməd)',
    category: 'bitki',
    price: 8.00,
    unit: 'ədəd',
    image: 'https://images.unsplash.com/photo-1567306226416-28f0efdc88ce?auto=format&fit=crop&q=80&w=400',
    description: 'Quba bölgəsinin məşhur şirin alması.',
    stock: 150
  },
  {
    id: '6',
    name: 'Təzə Kənd Yumurtası',
    category: 'digər',
    price: 0.30,
    unit: 'ədəd',
    image: 'https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?auto=format&fit=crop&q=80&w=400',
    description: 'Gündəlik təzə yığılmış kənd yumurtaları.',
    stock: 200
  },
  {
    id: '7',
    name: 'Brama Cücələri',
    category: 'quş',
    price: 5.00,
    unit: 'ədəd',
    image: 'https://images.unsplash.com/photo-1569254994521-ddbb54af5ae8?auto=format&fit=crop&q=80&w=400',
    description: '1 həftəlik Brama cücələri, sağlam və aktiv.',
    stock: 100
  },
  {
    id: '8',
    name: 'Çiyələk Şitili (Albion)',
    category: 'bitki',
    price: 1.20,
    unit: 'ədəd',
    image: 'https://images.unsplash.com/photo-1464960726307-8832473994bb?auto=format&fit=crop&q=80&w=400',
    description: 'Bütün mövsüm bar verən Albion sortu.',
    stock: 300
  }
];
