/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from "motion/react";
import { 
  Sprout, 
  Bird, 
  ShoppingBag, 
  MessageSquare, 
  MessageCircle,
  LayoutDashboard, 
  Menu, 
  X, 
  Search, 
  ArrowRight,
  TrendingUp,
  Users,
  Calendar,
  ChevronRight,
  ChevronLeft,
  Trash2,
  Sparkles,
  Send,
  LogOut,
  LogIn,
  ClipboardList,
  Clock,
  CheckCircle2,
  AlertCircle,
  Camera,
  Edit2,
  Phone,
  Mail,
  MapPin,
  Image as ImageIcon,
  Plus,
  Settings,
  ChevronUp,
  Tag,
  FileText,
  ClipboardList as ClipboardListIcon,
  Check,
  Ban
} from 'lucide-react';
import { PRODUCTS } from './constants';
import { Toaster, toast } from 'sonner';
import { Product, UserSale } from './types';
import { getAgroAdvice } from './services/geminiService';
import ReactMarkdown from 'react-markdown';
import AuthModal from './components/AuthModal';
import AdminPanel from './components/AdminPanel';
import { 
  auth, 
  db, 
  logout, 
  collection, 
  addDoc, 
  serverTimestamp, 
  query, 
  where, 
  orderBy, 
  onSnapshot,
  handleFirestoreError,
  OperationType,
  doc,
  getDoc,
  seedProducts,
  deleteProduct,
  addProduct,
  updateProduct,
  updateOrder,
  deleteOrder,
  submitUserSale,
  updateUserSaleStatus,
  checkRedirectResult,
  getLogoUrl,
  updateLogoUrl
} from './firebase';
import { onAuthStateChanged, User } from 'firebase/auth';

interface OrderFormData {
  fullName: string;
  phone: string;
}

interface FirestoreOrder {
  id: string;
  productName: string;
  price: number;
  customerName: string;
  phone: string;
  status: 'pending' | 'processing' | 'completed' | 'cancelled';
  createdAt: any;
  estimatedDelivery?: string;
}

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean, error: any }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      let errorMessage = "Bir xəta baş verdi.";
      try {
        const parsed = JSON.parse(this.state.error.message);
        if (parsed.error) errorMessage = `Xəta: ${parsed.error}`;
      } catch (e) {
        errorMessage = this.state.error.message || errorMessage;
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-stone-50 p-4">
          <div className="bg-white p-8 rounded-3xl shadow-xl border border-stone-200 max-w-md w-full text-center space-y-4">
            <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto">
              <AlertCircle size={32} />
            </div>
            <h2 className="text-2xl font-display font-bold text-stone-800">Xəta Baş Verdi</h2>
            <p className="text-stone-500">{errorMessage}</p>
            <button 
              onClick={() => window.location.reload()}
              className="w-full py-3 bg-primary-600 text-white rounded-xl font-bold hover:bg-primary-700 transition-colors"
            >
              Səhifəni Yenilə
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

function UserSaleForm({ user, onSubmit }: { user: any, onSubmit: (sale: Omit<UserSale, 'id' | 'userId' | 'userName' | 'userEmail' | 'status' | 'createdAt'>) => Promise<void> }) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: 0,
    unit: 'ədəd' as const,
    category: 'digər' as const,
    phone: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedOrderNumber, setSubmittedOrderNumber] = useState<string | null>(null);

  useEffect(() => {
    if (user?.phoneNumber && !formData.phone) {
      setFormData(prev => ({ ...prev, phone: user.phoneNumber }));
    }
  }, [user]);

  const generateOrderNumber = () => {
    const prefix = 'ELAN';
    const random = Math.floor(1000 + Math.random() * 9000);
    const timestamp = Date.now().toString().slice(-4);
    return `${prefix}-${random}-${timestamp}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    const orderNumber = generateOrderNumber();

    try {
      await onSubmit({ ...formData, orderNumber });
      setSubmittedOrderNumber(orderNumber);
      setFormData({ name: '', description: '', price: 0, unit: 'ədəd', category: 'digər', phone: '' });
      toast.success('Elanınız uğurla qeyd olundu!');
    } catch (error: any) {
      console.error('Submission error:', error);
      let errorMessage = 'Xəta baş verdi. Yenidən cəhd edin.';
      
      try {
        // Try to parse if it's a JSON error from handleFirestoreError
        const parsedError = JSON.parse(error.message);
        if (parsedError.error.includes('permissions')) {
          errorMessage = 'İcazə xətası. Zəhmət olmasa yenidən daxil olun və ya adminlə əlaqə saxlayın.';
        } else {
          errorMessage = parsedError.error;
        }
      } catch (e) {
        errorMessage = error?.message || errorMessage;
      }
      
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submittedOrderNumber) {
    return (
      <div className="max-w-2xl mx-auto bg-white rounded-3xl shadow-xl shadow-stone-200/50 overflow-hidden border border-stone-100 p-12 text-center space-y-8 animate-in fade-in zoom-in duration-500">
        <div className="w-24 h-24 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 size={48} />
        </div>
        <div className="space-y-4">
          <h2 className="text-3xl font-display font-bold text-stone-800">Elanınız sistemə düşdü!</h2>
          <p className="text-stone-500 text-lg leading-relaxed">
            Sifariş nömrəniz: <span className="font-bold text-red-600">{submittedOrderNumber}</span>
          </p>
          <div className="bg-stone-50 p-6 rounded-2xl border border-stone-100 mt-6">
            <p className="text-stone-700 font-medium">
              Qəbul olunması üçün elanın şəkillərini WhatsApp nömrəsinə göndərin.
            </p>
          </div>
        </div>

        <div className="space-y-4 pt-4">
          <a 
            href={`https://wa.me/994556651665?text=${encodeURIComponent(`Salam, elanım üçün şəkilləri göndərirəm.\nSifariş nömrəsi: ${submittedOrderNumber}`)}`}
            target="_blank"
            rel="noreferrer"
            className="w-full py-5 bg-green-500 text-white rounded-2xl font-bold text-lg hover:bg-green-600 shadow-xl shadow-green-500/20 transition-all flex items-center justify-center gap-3"
          >
            <MessageCircle size={24} /> WhatsApp ilə şəkilləri göndər
          </a>
          <button 
            onClick={() => setSubmittedOrderNumber(null)}
            className="text-stone-400 font-medium hover:text-stone-600 transition-colors"
          >
            Yeni elan əlavə et
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto bg-white rounded-3xl shadow-xl shadow-stone-200/50 overflow-hidden border border-stone-100">
      <div className="p-8 bg-red-600 text-white">
        <h2 className="text-2xl font-display font-bold">Səndə Sat</h2>
        <p className="text-red-100 mt-1">Məlumatları doldurun və şəkilləri WhatsApp-a göndərin</p>
      </div>
      
      <form onSubmit={handleSubmit} className="p-8 space-y-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-bold text-stone-700 uppercase ml-1">Satıcı Məlumatları</label>
            <div className="flex items-center gap-4 px-5 py-4 bg-stone-50 border border-stone-200 rounded-2xl">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center text-red-600 font-bold text-lg shadow-inner">
                {user?.displayName?.[0]?.toUpperCase() || 'A'}
              </div>
              <div className="flex-1">
                <p className="text-stone-800 font-bold leading-tight">{user?.displayName || 'Anonim'}</p>
                <p className="text-stone-400 text-xs mt-0.5">{user?.email}</p>
              </div>
              <div className="px-3 py-1 bg-emerald-50 text-emerald-600 text-[10px] font-bold rounded-full border border-emerald-100">
                DAXİL OLUNUB
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-stone-700 uppercase ml-1">Məhsulun Adı</label>
            <input 
              required
              type="text" 
              placeholder="Məs: Kənd Yumurtası"
              className="w-full px-5 py-4 bg-stone-50 border border-stone-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-stone-700 uppercase ml-1">Əlaqə Nömrəsi</label>
            <input 
              required
              type="tel" 
              placeholder="Məs: 050 123 45 67"
              className="w-full px-5 py-4 bg-stone-50 border border-stone-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-stone-700 uppercase ml-1">Kateqoriya</label>
            <select 
              className="w-full px-5 py-4 bg-stone-50 border border-stone-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all appearance-none"
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
            >
              <option value="bitki">Bitkiçilik</option>
              <option value="quş">Quşçuluq</option>
              <option value="digər">Digər</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-stone-700 uppercase ml-1">Məhsulun Açıqlaması</label>
            <textarea 
              required
              rows={4}
              placeholder="Məhsul haqqında ətraflı məlumat..."
              className="w-full px-5 py-4 bg-stone-50 border border-stone-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all resize-none"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-bold text-stone-700 uppercase ml-1">Qiymət (₼)</label>
              <input 
                required
                type="number" 
                step="0.01"
                placeholder="0.00"
                className="w-full px-5 py-4 bg-stone-50 border border-stone-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all"
                value={formData.price || ''}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  setFormData({ ...formData, price: isNaN(val) ? 0 : val });
                }}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-stone-700 uppercase ml-1">Vahid</label>
              <select 
                className="w-full px-5 py-4 bg-stone-50 border border-stone-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all appearance-none"
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value as any })}
              >
                <option value="ədəd">ədəd</option>
                <option value="kq">kq</option>
                <option value="litr">litr</option>
                <option value="bağ">bağ</option>
              </select>
            </div>
          </div>
        </div>

        <button 
          type="submit"
          disabled={isSubmitting}
          className="w-full py-5 bg-red-600 text-white rounded-2xl font-bold text-lg hover:bg-red-700 shadow-xl shadow-red-600/20 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
        >
          {isSubmitting ? (
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin" />
              <span>Göndərilir...</span>
            </div>
          ) : (
            <>GÖNDƏR <ArrowRight size={22} /></>
          )}
        </button>
      </form>
    </div>
  );
}

function UserSalesList({ sales }: { sales: UserSale[] }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-display font-bold text-stone-800">Elanlarım</h2>
        <div className="px-4 py-2 bg-stone-100 rounded-full text-stone-500 text-sm font-bold">
          Cəmi: {sales.length}
        </div>
      </div>

      {sales.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-stone-200">
          <div className="w-20 h-20 bg-stone-50 rounded-full flex items-center justify-center mx-auto mb-4 text-stone-300">
            <FileText size={40} />
          </div>
          <h3 className="text-xl font-bold text-stone-800">Hələ ki elanınız yoxdur</h3>
          <p className="text-stone-500 mt-2">Məhsulunuzu satmaq üçün "Səndə Sat" bölməsinə keçin.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {sales.map((sale) => (
            <div key={sale.id} className="bg-white rounded-3xl border border-stone-100 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
              <div className="relative h-48">
                <img src={sale.image} alt={sale.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                {sale.status === 'pending' && (
                  <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] flex flex-col items-center justify-center text-center p-4">
                    <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center text-white mb-2 animate-pulse">
                      <ImageIcon size={24} />
                    </div>
                    <p className="text-white text-xs font-bold uppercase tracking-wider">Şəkillər Gözlənilir</p>
                    <p className="text-white/60 text-[10px] mt-1">Admin tərəfindən şəkilləriniz əlavə olunacaq</p>
                  </div>
                )}
                <div className="absolute top-4 right-4">
                  <span className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider shadow-lg ${
                    sale.status === 'approved' ? 'bg-green-500 text-white' :
                    sale.status === 'rejected' ? 'bg-red-500 text-white' :
                    'bg-amber-500 text-white'
                  }`}>
                    {sale.status === 'approved' ? 'Təsdiqləndi' :
                     sale.status === 'rejected' ? 'Ləğv edildi' :
                     'Gözləmədə'}
                  </span>
                </div>
              </div>
              <div className="p-6">
                <h3 className="font-bold text-stone-800 text-lg line-clamp-1">{sale.name}</h3>
                <p className="text-stone-500 text-sm mt-1 line-clamp-2">{sale.description}</p>
                <div className="mt-4 flex items-center justify-between">
                  <div className="text-primary-600 font-bold text-xl">
                    {sale.price} ₼ <span className="text-sm text-stone-400 font-normal">/ {sale.unit}</span>
                  </div>
                  <div className="text-xs text-stone-400">
                    {sale.createdAt ? new Date(sale.createdAt.seconds * 1000).toLocaleDateString('az-AZ') : ''}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}



export default function App() {
  return (
    <ErrorBoundary>
      <AppContent />
    </ErrorBoundary>
  );
}

const formatDate = (timestamp: any) => {
  if (!timestamp) return 'İndi';
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday = date.toDateString() === yesterday.toDateString();

  const time = date.toLocaleTimeString('az-AZ', { hour: '2-digit', minute: '2-digit', hour12: false });

  if (isToday) return `Bugün, ${time}`;
  if (isYesterday) return `Dünən, ${time}`;
  
  return date.toLocaleDateString('az-AZ', { day: 'numeric', month: 'short' }) + `, ${time}`;
};

function AppContent() {
  const [activeTab, setActiveTab] = useState('shop');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isCategoriesOpen, setIsCategoriesOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [aiInput, setAiInput] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const handleUpdateProduct = async (productId: string, updates: Partial<Omit<Product, 'id'>>) => {
    console.log('handleUpdateProduct called', productId, updates);
    if (!isAdmin) {
      console.log('Not admin');
      return;
    }
    try {
      await updateProduct(productId, updates);
      console.log('updateProduct success');
      setEditingProduct(null);
    } catch (error) {
      console.error('Update error:', error);
      alert('Məhsul yenilənərkən xəta baş verdi.');
    }
  };
  const [orderStatus, setOrderStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [user, setUser] = useState<User | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [userOrders, setUserOrders] = useState<FirestoreOrder[]>([]);
  const [allOrders, setAllOrders] = useState<FirestoreOrder[]>([]);
  const [userSales, setUserSales] = useState<UserSale[]>([]);
  const [allUserSales, setAllUserSales] = useState<UserSale[]>([]);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [newProduct, setNewProduct] = useState<Omit<Product, 'id'>>({
    name: '',
    category: 'bitki',
    price: 0,
    unit: 'ədəd',
    image: 'https://picsum.photos/seed/agro/800/600',
    description: '',
    stock: 0
  });

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'products'), (snapshot) => {
      const p = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Product[];
      
      // Sort products by createdAt descending, handling missing createdAt
      p.sort((a, b) => {
        const dateA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
        const dateB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
        return dateB - dateA;
      });
      
      setProducts(p);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'products');
    });
    getLogoUrl().then(url => setLogoUrl(url));
    return () => unsubscribe();
  }, []);

  const [isStatusViewerOpen, setIsStatusViewerOpen] = useState(false);
  const [currentStatusIndex, setCurrentStatusIndex] = useState(0);
  const [statusProgress, setStatusProgress] = useState(0);

  // Status viewer logic
  useEffect(() => {
    let interval: any;
    if (isStatusViewerOpen) {
      interval = setInterval(() => {
        setStatusProgress((prev) => {
          if (prev >= 100) {
            if (currentStatusIndex < products.length - 1) {
              setCurrentStatusIndex(currentStatusIndex + 1);
              return 0;
            } else {
              setIsStatusViewerOpen(false);
              return 0;
            }
          }
          return prev + 1;
        });
      }, 50); // 5 seconds total (100 * 50ms)
    }
    return () => clearInterval(interval);
  }, [isStatusViewerOpen, currentStatusIndex, products.length]);

  const openStatus = (index: number) => {
    setCurrentStatusIndex(index);
    setStatusProgress(0);
    setIsStatusViewerOpen(true);
  };

  useEffect(() => {
    const handleRedirect = async () => {
      try {
        const redirectedUser = await checkRedirectResult();
        if (redirectedUser) {
          console.log('Redirect login success:', redirectedUser);
          // The onAuthStateChanged will handle the state update
        }
      } catch (error) {
        console.error('Redirect login error:', error);
      }
    };
    handleRedirect();

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      console.log('onAuthStateChanged', currentUser);
      setUser(currentUser);
      if (currentUser) {
        console.log('currentUser email', currentUser.email);
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
        let adminStatus = currentUser.email?.toLowerCase() === 'camalmanafov022@gmail.com';
        console.log('adminStatus initial', adminStatus);
        
        if (userDoc.exists()) {
          const userData = userDoc.data();
          console.log('userData', userData);
          if (userData.role === 'admin') adminStatus = true;
        }
        
        console.log('adminStatus final', adminStatus);
        setIsAdmin(adminStatus);
        if (adminStatus) {
          seedProducts(PRODUCTS);
        }
      } else {
        setIsAdmin(false);
      }
      setIsAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) {
      setUserOrders([]);
      return;
    }

    const q = query(
      collection(db, 'orders'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const orders = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as FirestoreOrder[];
      setUserOrders(orders);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'orders');
    });

    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (!isAdmin) {
      setAllOrders([]);
      return;
    }

    const q = query(
      collection(db, 'orders'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const orders = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as FirestoreOrder[];
      setAllOrders(orders);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'orders');
    });

    return () => unsubscribe();
  }, [isAdmin]);

  useEffect(() => {
    if (!user) {
      setUserSales([]);
      return;
    }

    const q = query(
      collection(db, 'user_sales'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const sales = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as UserSale[];
      setUserSales(sales);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'user_sales');
    });

    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (!isAdmin) {
      setAllUserSales([]);
      return;
    }

    const q = query(
      collection(db, 'user_sales'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const sales = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as UserSale[];
      setAllUserSales(sales);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'user_sales');
    });

    return () => unsubscribe();
  }, [isAdmin]);

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleDeleteProduct = async (productId: string) => {
    if (!isAdmin) return;
    if (window.confirm('Bu məhsulu silmək istədiyinizə əminsiniz?')) {
      try {
        await deleteProduct(productId);
      } catch (error) {
        console.error('Delete error:', error);
      }
    }
  };

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;
    try {
      await addProduct(newProduct);
      setNewProduct({
        name: '',
        category: 'bitki',
        price: 0,
        unit: 'ədəd',
        image: 'https://picsum.photos/seed/agro/800/600',
        description: '',
        stock: 0
      });
    } catch (error) {
      console.error('Add error:', error);
    }
  };

  const handleAiSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiInput.trim()) return;
    
    setIsAiLoading(true);
    setAiResponse('');
    const response = await getAgroAdvice(aiInput);
    setAiResponse(response || '');
    setIsAiLoading(false);
  };

  const handleLogin = () => {
    setShowAuthModal(true);
  };

  const handleOrderSubmit = async (formData: OrderFormData) => {
    if (!selectedProduct) return;
    
    setOrderStatus('submitting');
    
    try {
      // 1. Send email via backend
      const response = await fetch('/api/order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          product: selectedProduct.name,
          price: selectedProduct.price,
          customer: formData.fullName,
          phone: formData.phone,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to submit order');
      }

      // 2. Save to Firestore if logged in
      if (user) {
        try {
          await addDoc(collection(db, 'orders'), {
            userId: user.uid,
            productName: selectedProduct.name,
            price: selectedProduct.price,
            customerName: formData.fullName,
            phone: formData.phone,
            status: 'pending',
            createdAt: serverTimestamp()
          });
        } catch (fsError) {
          handleFirestoreError(fsError, OperationType.CREATE, 'orders');
        }
      }
      
      setOrderStatus('success');
      setTimeout(() => {
        setSelectedProduct(null);
        setOrderStatus('idle');
      }, 2000);
    } catch (error) {
      console.error('Order error:', error);
      setOrderStatus('error');
    }
  };

  return (
    <div className="flex h-screen bg-stone-50 overflow-hidden relative">
      <Toaster position="top-right" richColors />
      {showAuthModal && <AuthModal onClose={() => setShowAuthModal(false)} />}
      {/* Status Viewer */}
      {isStatusViewerOpen && (
        <StatusViewer 
          products={products}
          currentIndex={currentStatusIndex}
          progress={statusProgress}
          onClose={() => setIsStatusViewerOpen(false)}
          onOrder={(product) => setSelectedProduct(product)}
          setCurrentStatusIndex={setCurrentStatusIndex}
          setStatusProgress={setStatusProgress}
        />
      )}

      {/* Order Modal */}
      {selectedProduct && (
        <OrderModal 
          product={selectedProduct} 
          status={orderStatus}
          onClose={() => { setSelectedProduct(null); setOrderStatus('idle'); }}
          onSubmit={handleOrderSubmit}
          setStatus={setOrderStatus}
          user={user}
        />
      )}

      {/* Edit Product Modal */}
      {editingProduct && (
        <EditProductModal 
          product={editingProduct} 
          onClose={() => setEditingProduct(null)}
          onUpdate={handleUpdateProduct}
        />
      )}

      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div 
          onClick={() => setIsSidebarOpen(false)}
          className="fixed inset-0 bg-black/40 z-30 lg:hidden backdrop-blur-sm"
        />
      )}

      {/* Sidebar */}
      <aside 
        className={`fixed lg:relative h-full bg-white border-r border-stone-200 flex flex-col z-40 overflow-hidden ${
          isSidebarOpen ? 'w-[280px] translate-x-0' : (window.innerWidth < 1024 ? 'w-0 -translate-x-full' : 'w-20 translate-x-0')
        }`}
      >
        <div className="p-6 flex items-center gap-3 shrink-0 cursor-pointer" onClick={async () => {
          if (isAdmin) {
            const newUrl = window.prompt('Yeni logo URL-ni daxil edin:', logoUrl || '');
            if (newUrl) {
              await updateLogoUrl(newUrl);
              setLogoUrl(newUrl);
            }
          }
        }}>
          <div className="w-10 h-10 bg-primary-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-primary-600/20 overflow-hidden">
            {logoUrl ? <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" referrerPolicy="no-referrer" /> : <Sprout size={24} />}
          </div>
          <span className="font-display font-bold text-xl tracking-tight text-stone-800 whitespace-nowrap">AqroMüasir</span>
        </div>

        <nav className="flex-1 px-4 space-y-2 mt-4 overflow-y-auto">
          <NavItem 
            icon={<LayoutDashboard size={20} />} 
            label="Panel" 
            active={activeTab === 'dashboard'} 
            onClick={() => { setActiveTab('dashboard'); if(window.innerWidth < 1024) setIsSidebarOpen(false); }}
            showLabel={isSidebarOpen || window.innerWidth < 1024}
          />
          <NavItem 
            icon={<Tag size={20} />} 
            label="Kategoriyalar" 
            active={activeTab === 'bitki' || activeTab === 'quş'} 
            onClick={() => setIsCategoriesOpen(!isCategoriesOpen)}
            showLabel={isSidebarOpen || window.innerWidth < 1024}
          />
          {isCategoriesOpen && (
            <div className="pl-8 space-y-2">
              <NavItem 
                icon={<Sprout size={16} />} 
                label="Bitkiçilik" 
                active={activeTab === 'bitki'} 
                onClick={() => { setActiveTab('bitki'); if(window.innerWidth < 1024) setIsSidebarOpen(false); }}
                showLabel={isSidebarOpen || window.innerWidth < 1024}
              />
              <NavItem 
                icon={<Bird size={16} />} 
                label="Quşçuluq" 
                active={activeTab === 'quş'} 
                onClick={() => { setActiveTab('quş'); if(window.innerWidth < 1024) setIsSidebarOpen(false); }}
                showLabel={isSidebarOpen || window.innerWidth < 1024}
              />
            </div>
          )}
          <NavItem 
            icon={<ShoppingBag size={20} />} 
            label="Mağaza" 
            active={activeTab === 'shop'} 
            onClick={() => { setActiveTab('shop'); if(window.innerWidth < 1024) setIsSidebarOpen(false); }}
            showLabel={isSidebarOpen || window.innerWidth < 1024}
          />
          {user && (
            <NavItem 
              icon={<FileText size={20} />} 
              label="Elanlarım" 
              active={activeTab === 'my-ads'} 
              onClick={() => { setActiveTab('my-ads'); if(window.innerWidth < 1024) setIsSidebarOpen(false); }}
              showLabel={isSidebarOpen || window.innerWidth < 1024}
            />
          )}
          <NavItem 
            icon={<MessageSquare size={20} />} 
            label="AI Məsləhətçi" 
            active={activeTab === 'ai'} 
            onClick={() => { setActiveTab('ai'); if(window.innerWidth < 1024) setIsSidebarOpen(false); }}
            showLabel={isSidebarOpen || window.innerWidth < 1024}
          />
          {isAdmin && (
            <>
              <NavItem 
                icon={<Users size={20} />} 
                label="Admin Panel" 
                active={activeTab === 'admin-panel'} 
                onClick={() => { setActiveTab('admin-panel'); if(window.innerWidth < 1024) setIsSidebarOpen(false); }}
                showLabel={isSidebarOpen || window.innerWidth < 1024}
              />
              <NavItem 
                icon={<Settings size={20} />} 
                label="Məhsul İdarəetməsi" 
                active={activeTab === 'admin'} 
                onClick={() => { setActiveTab('admin'); if(window.innerWidth < 1024) setIsSidebarOpen(false); }}
                showLabel={isSidebarOpen || window.innerWidth < 1024}
              />
              <NavItem 
                icon={<ClipboardList size={20} />} 
                label="Sifarişlərin İdarə Edilməsi" 
                active={activeTab === 'admin-orders'} 
                onClick={() => { setActiveTab('admin-orders'); if(window.innerWidth < 1024) setIsSidebarOpen(false); }}
                showLabel={isSidebarOpen || window.innerWidth < 1024}
              />
            </>
          )}
          {user && (
            <NavItem 
              icon={<ClipboardList size={20} />} 
              label="Sifarişlərim" 
              active={activeTab === 'orders'} 
              onClick={() => { setActiveTab('orders'); if(window.innerWidth < 1024) setIsSidebarOpen(false); }}
              showLabel={isSidebarOpen || window.innerWidth < 1024}
            />
          )}
          <NavItem 
            icon={<Phone size={20} />} 
            label="Əlaqə" 
            active={activeTab === 'contact'} 
            onClick={() => { setActiveTab('contact'); if(window.innerWidth < 1024) setIsSidebarOpen(false); }}
            showLabel={isSidebarOpen || window.innerWidth < 1024}
          />
        </nav>

        <div className="p-4 border-t border-stone-100 hidden lg:block">
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="w-full flex items-center justify-center p-2 hover:bg-stone-100 rounded-lg text-stone-500"
          >
            {isSidebarOpen ? <ChevronRight className="rotate-180" size={20} /> : <ChevronRight size={20} />}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto relative w-full">
        <header className="sticky top-0 z-20 bg-stone-50/80 backdrop-blur-md border-b border-stone-200 px-4 sm:px-8 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="lg:hidden p-2 hover:bg-stone-200 rounded-lg text-stone-600"
            >
              <Menu size={24} />
            </button>
            <h2 className="text-lg sm:text-2xl font-display font-bold text-stone-800 capitalize truncate">
              {activeTab === 'dashboard' ? 'Əsas Panel' : 
               activeTab === 'bitki' ? 'Bitkiçilik' : 
               activeTab === 'quş' ? 'Quşçuluq' : 
               activeTab === 'shop' ? 'Ucuz al, qənaət et' : 
               activeTab === 'orders' ? 'Sifarişlərim' : 
               activeTab === 'sell' ? 'Səndə Sat' :
               activeTab === 'my-ads' ? 'Elanlarım' :
               activeTab === 'admin-user-sales' ? 'İstifadəçi Satışları' :
               activeTab === 'contact' ? 'Əlaqə' : 
               activeTab === 'admin' ? 'Məhsul İdarəetməsi' : 
               activeTab === 'admin-orders' ? 'Sifarişlərin İdarə Edilməsi' : 'AI Məsləhətçi'}
            </h2>
          </div>
          
          <div className="flex items-center gap-2 sm:gap-4 shrink-0">
            {user ? (
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="text-right">
                  <p className="text-xs font-bold text-stone-800 line-clamp-1 hidden sm:block">{user.displayName}</p>
                  <button 
                    onClick={logout} 
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-full text-xs font-bold transition-all shadow-sm"
                  >
                    <LogOut size={12} /> Çıxış
                  </button>
                </div>
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-stone-200 overflow-hidden border-2 border-white shadow-sm">
                  <img src={user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`} alt="User" referrerPolicy="no-referrer" />
                </div>
              </div>
            ) : (
              <button 
                onClick={handleLogin}
                className="flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-white border border-stone-200 rounded-full text-xs sm:text-sm font-semibold text-stone-700 hover:bg-stone-50 transition-colors shadow-sm"
              >
                <LogIn size={16} className="text-primary-600" />
                <span className="hidden xs:inline">Giriş</span>
              </button>
            )}
          </div>
        </header>

        <div className="p-4 sm:p-8 max-w-7xl mx-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
            >
              {/* Dashboard removed */}

          {(activeTab === 'bitki' || activeTab === 'quş' || activeTab === 'shop') && (
            <div className="sticky top-[65px] sm:top-[73px] z-10 bg-stone-50/90 backdrop-blur-md -mx-4 px-4 sm:-mx-8 sm:px-8 py-4 mb-6 border-b border-stone-200/60 animate-in fade-in slide-in-from-top-4 duration-700">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm sm:text-lg font-display font-bold text-stone-800 flex items-center gap-2">
                  <div className="w-2 h-2 bg-primary-500 rounded-full animate-pulse" />
                  Statuslar
                </h3>
                <span className="text-[9px] sm:text-[10px] uppercase tracking-widest font-bold text-stone-400">Yeni Məhsullar</span>
              </div>
              
              <div className="flex gap-4 overflow-x-auto pb-2 no-scrollbar">
                {products.map((product, index) => (
                  <motion.div 
                    key={`status-${product.id}`}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => openStatus(index)}
                    className="flex-shrink-0 group cursor-pointer"
                  >
                    <div className="relative w-14 h-14 sm:w-20 sm:h-20 rounded-2xl p-[2px] bg-gradient-to-tr from-primary-500 to-emerald-400 shadow-lg shadow-primary-500/10">
                      <div className="w-full h-full rounded-[13px] overflow-hidden bg-white border-2 border-white">
                        <img 
                          src={product.image} 
                          alt={product.name} 
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                      <div className="absolute -bottom-1 -right-1 bg-white p-1 rounded-lg shadow-sm">
                        <Plus size={10} className="text-primary-600" />
                      </div>
                    </div>
                    <div className="mt-1.5 text-center">
                      <p className="text-[9px] sm:text-[10px] font-bold text-stone-700 truncate w-14 sm:w-20">{product.name}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {(activeTab === 'bitki' || activeTab === 'quş' || activeTab === 'shop') && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
              {filteredProducts
                .filter(p => activeTab === 'shop' || p.category === activeTab)
                .map(product => (
                  <ProductCard 
                    key={product.id} 
                    product={product} 
                    onOrder={() => setSelectedProduct(product)}
                    isAdmin={isAdmin}
                    onEdit={() => setEditingProduct(product)}
                  />
                ))}
            </div>
          )}

          {activeTab === 'ai' && (
            <div className="max-w-3xl mx-auto space-y-6">
              {!user ? (
                <div className="bg-white rounded-3xl p-8 sm:p-12 border border-stone-200 shadow-xl text-center">
                  <div className="w-20 h-20 bg-primary-50 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Sparkles size={40} className="text-primary-600" />
                  </div>
                  <h3 className="text-2xl font-display font-bold text-stone-800 mb-4">
                    Aqro-AI Məsləhətçisi
                  </h3>
                  <p className="text-stone-500 mb-8 max-w-md mx-auto">
                    Süni zəka məsləhətçisindən istifadə etmək üçün zəhmət olmasa hesabınıza daxil olun və ya qeydiyyatdan keçin.
                  </p>
                  <button 
                    onClick={() => setShowAuthModal(true)}
                    className="px-8 py-4 bg-primary-600 text-white rounded-2xl font-bold hover:bg-primary-700 transition-all shadow-lg shadow-primary-600/20 flex items-center gap-2 mx-auto"
                  >
                    <LogIn size={20} />
                    Daxil ol / Qeydiyyat
                  </button>
                </div>
              ) : (
                <>
                  <div className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200 shadow-xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-6 opacity-10">
                      <Sparkles size={120} className="text-primary-600" />
                    </div>
                    
                    <div className="relative z-10">
                      <h3 className="text-2xl sm:text-3xl font-display font-bold text-stone-800 mb-2 flex items-center gap-3">
                        Aqro-AI <Sparkles className="text-primary-500" />
                      </h3>
                      <p className="text-stone-500 mb-6 sm:mb-8 text-sm sm:text-base">Kənd təsərrüfatı ilə bağlı suallarınızı verin.</p>
                      
                      <form onSubmit={handleAiSubmit} className="flex flex-col gap-3">
                        <div className="flex flex-col sm:flex-row gap-2">
                          <input 
                            type="text" 
                            value={aiInput}
                            onChange={(e) => setAiInput(e.target.value)}
                            placeholder="Sualınızı yazın..."
                            className="flex-1 px-4 sm:px-6 py-3 sm:py-4 bg-stone-50 border border-stone-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 text-sm sm:text-base"
                          />
                          <button 
                            type="submit"
                            disabled={isAiLoading}
                            title="Məsləhət al"
                            className="px-6 py-3 sm:py-0 bg-primary-600 text-white rounded-2xl hover:bg-primary-700 disabled:opacity-50 flex items-center justify-center shrink-0 transition-colors"
                          >
                            {isAiLoading ? (
                              <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                              <Send size={20} />
                            )}
                          </button>
                        </div>
                        <p className="text-[10px] text-stone-400 italic">
                          * Məsləhət almaq üçün <Send size={10} className="inline" /> düyməsinə klikləyin.
                        </p>
                      </form>
                    </div>
                  </div>

                  {aiResponse && (
                    <div className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200 shadow-sm prose prose-stone max-w-none text-sm sm:text-base">
                      <ReactMarkdown>{aiResponse}</ReactMarkdown>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {activeTab === 'orders' && user && (
            <div className="max-w-4xl mx-auto space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-2xl font-display font-bold text-stone-800">Sifariş Tarixçəsi</h3>
                <span className="text-sm text-stone-500">{userOrders.length} sifariş</span>
              </div>

              {userOrders.length === 0 ? (
                <div className="bg-white p-12 rounded-3xl border border-stone-200 text-center space-y-4">
                  <div className="w-16 h-16 bg-stone-50 text-stone-300 rounded-full flex items-center justify-center mx-auto">
                    <ClipboardList size={32} />
                  </div>
                  <p className="text-stone-500">Hələ heç bir sifarişiniz yoxdur.</p>
                  <button 
                    onClick={() => setActiveTab('shop')}
                    className="px-6 py-2 bg-primary-600 text-white rounded-xl font-semibold hover:bg-primary-700"
                  >
                    Mağazaya Get
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {userOrders.map(order => (
                    <div key={order.id} className="bg-white p-4 sm:p-6 rounded-2xl border border-stone-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-stone-50 rounded-xl flex items-center justify-center text-primary-600">
                          <ShoppingBag size={24} />
                        </div>
                        <div>
                          <h4 className="font-bold text-stone-800">{order.productName}</h4>
                          <p className="text-sm text-stone-500 flex items-center gap-1">
                            <Clock size={12} /> {order.createdAt?.toDate ? order.createdAt.toDate().toLocaleDateString('az-AZ') : 'Gözlənilir'}
                          </p>
                          {order.estimatedDelivery && (
                            <p className="text-xs text-primary-600 mt-1 font-medium italic">
                              Çatdırılma: {order.estimatedDelivery}
                            </p>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between sm:justify-end gap-8">
                        <div className="text-right">
                          <p className="text-lg font-display font-bold text-stone-800">{order.price} ₼</p>
                          <p className="text-[10px] text-stone-400 uppercase font-bold tracking-wider">Qiymət</p>
                        </div>
                        <button 
                          onClick={() => deleteOrder(order.id)}
                          className="p-2 text-stone-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                          title="Sifarişi sil"
                        >
                          <Trash2 size={18} />
                        </button>
                        
                        <div className={`px-3 py-1 rounded-full flex items-center gap-1.5 text-xs font-bold ${
                          order.status === 'completed' ? 'bg-emerald-50 text-emerald-600' :
                          order.status === 'processing' ? 'bg-blue-50 text-blue-600' :
                          order.status === 'cancelled' ? 'bg-red-50 text-red-600' :
                          'bg-amber-50 text-amber-600'
                        }`}>
                          {order.status === 'completed' ? <CheckCircle2 size={14} /> : <Clock size={14} />}
                          <span className="capitalize">
                            {order.status === 'pending' ? 'Gözləyir' :
                             order.status === 'processing' ? 'Hazırlanır' :
                             order.status === 'completed' ? 'Tamamlandı' : 'Ləğv edildi'}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 'sell' tab removed */}

          {activeTab === 'my-ads' && user && (
            <UserSalesList sales={userSales} />
          )}

          {activeTab === 'contact' && (
            <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-8 rounded-3xl border border-stone-200 shadow-sm text-center space-y-4">
                  <div className="w-16 h-16 bg-primary-50 text-primary-600 rounded-2xl flex items-center justify-center mx-auto">
                    <svg 
                      width="32" 
                      height="32" 
                      viewBox="0 0 24 24" 
                      fill="none" 
                      stroke="currentColor" 
                      strokeWidth="2" 
                      strokeLinecap="round" 
                      strokeLinejoin="round"
                    >
                      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
                    </svg>
                  </div>
                  <h3 className="text-xl font-display font-bold text-stone-800">WhatsApp</h3>
                  <p className="text-stone-500">Hər hansı sualınız varsa və ya məhsul haqqında birbaşa WhatsApp nömrəsinə yazın.</p>
                  <a href="https://wa.me/994556651665" target="_blank" rel="noopener noreferrer" className="block text-primary-600 font-bold text-lg hover:underline">055 665 16 65</a>
                </div>

                <div className="bg-white p-8 rounded-3xl border border-stone-200 shadow-sm text-center space-y-4">
                  <div className="w-16 h-16 bg-primary-50 text-primary-600 rounded-2xl flex items-center justify-center mx-auto">
                    <Mail size={32} />
                  </div>
                  <h3 className="text-xl font-display font-bold text-stone-800">E-poçt</h3>
                  <p className="text-stone-500">Təklif və iradlarınız üçün bizə yazın.</p>
                  <a href="mailto:diqqet02@mail.ru" className="block text-primary-600 font-bold text-lg hover:underline">diqqet02@mail.ru</a>
                </div>
              </div>

              <div className="bg-white p-8 rounded-3xl border border-stone-200 shadow-sm">
                <h3 className="text-2xl font-display font-bold text-stone-800 mb-6">Bizə Mesaj Göndərin</h3>
                <form className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-stone-500 ml-1">Adınız</label>
                    <input type="text" className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none" placeholder="Məs: Əli Məmmədov" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-stone-500 ml-1">E-poçtunuz</label>
                    <input type="email" className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none" placeholder="Məs: ali@example.com" />
                  </div>
                  <div className="md:col-span-2 space-y-2">
                    <label className="text-sm font-bold text-stone-500 ml-1">Mesajınız</label>
                    <textarea rows={4} className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none resize-none" placeholder="Mesajınızı bura yazın..."></textarea>
                  </div>
                  <button type="button" className="md:col-span-2 py-4 bg-primary-600 text-white rounded-2xl font-bold hover:bg-primary-700 shadow-lg shadow-primary-600/20 transition-all">
                    Göndər
                  </button>
                </form>
              </div>
            </div>
          )}

          {activeTab === 'admin' && isAdmin && (
            <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="bg-white p-8 rounded-3xl border border-stone-200 shadow-sm">
                <h3 className="text-2xl font-display font-bold text-stone-800 mb-6">Məhsullar Siyahısı</h3>
                <div className="space-y-4">
                  {products.map(product => (
                    <div key={product.id} className="flex items-center justify-between p-4 bg-stone-50 rounded-2xl border border-stone-100">
                      <div className="flex items-center gap-4">
                        <img src={product.image} alt={product.name} className="w-12 h-12 rounded-lg object-cover" referrerPolicy="no-referrer" />
                        <div>
                          <h4 className="font-bold text-stone-800">{product.name}</h4>
                          <p className="text-sm text-stone-500">{product.price} AZN / {product.unit}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => setEditingProduct(product)}
                          className="p-2 bg-white rounded-full text-stone-600 hover:bg-stone-100 border border-stone-200"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button 
                          onClick={() => handleDeleteProduct(product.id)}
                          className="p-2 bg-white rounded-full text-red-500 hover:bg-red-50 border border-stone-200"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white p-8 rounded-3xl border border-stone-200 shadow-sm">
                <h3 className="text-2xl font-display font-bold text-stone-800 mb-6 flex items-center gap-2">
                  <Plus className="text-primary-600" /> Yeni Məhsul Əlavə Et
                </h3>
                <form onSubmit={handleAddProduct} className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-stone-500 ml-1">Məhsulun Adı</label>
                    <input 
                      type="text" 
                      required
                      className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none" 
                      placeholder="Məs: Pomidor Şitili"
                      value={newProduct.name}
                      onChange={(e) => setNewProduct({...newProduct, name: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-stone-500 ml-1">Kateqoriya</label>
                    <select 
                      className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none"
                      value={newProduct.category}
                      onChange={(e) => setNewProduct({...newProduct, category: e.target.value as any})}
                    >
                      <option value="bitki">Bitkiçilik</option>
                      <option value="quş">Quşçuluq</option>
                      <option value="digər">Digər</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-stone-500 ml-1">Qiymət (AZN)</label>
                    <input 
                      type="number" 
                      step="0.01"
                      required
                      className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none" 
                      placeholder="0.00"
                      value={newProduct.price}
                      onChange={(e) => setNewProduct({...newProduct, price: parseFloat(e.target.value)})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-stone-500 ml-1">Vahid</label>
                    <input 
                      type="text" 
                      required
                      className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none" 
                      placeholder="ədəd, kq, litr"
                      value={newProduct.unit}
                      onChange={(e) => setNewProduct({...newProduct, unit: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-stone-500 ml-1">Stok Miqdarı</label>
                    <input 
                      type="number" 
                      required
                      className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none" 
                      placeholder="0"
                      value={newProduct.stock}
                      onChange={(e) => setNewProduct({...newProduct, stock: parseInt(e.target.value)})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-stone-500 ml-1">Şəkil URL</label>
                    <input 
                      type="text" 
                      required
                      className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none" 
                      placeholder="https://..."
                      value={newProduct.image}
                      onChange={(e) => setNewProduct({...newProduct, image: e.target.value})}
                    />
                  </div>
                  <div className="md:col-span-3 space-y-2">
                    <label className="text-sm font-bold text-stone-500 ml-1">Təsvir</label>
                    <textarea 
                      rows={3} 
                      className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none resize-none" 
                      placeholder="Məhsul haqqında məlumat..."
                      value={newProduct.description}
                      onChange={(e) => setNewProduct({...newProduct, description: e.target.value})}
                    ></textarea>
                  </div>
                  <button type="submit" className="md:col-span-3 py-4 bg-primary-600 text-white rounded-2xl font-bold hover:bg-primary-700 shadow-lg shadow-primary-600/20 transition-all flex items-center justify-center gap-2">
                    <Plus size={20} /> Məhsulu Əlavə Et
                  </button>
                </form>
              </div>

              <div className="bg-white rounded-3xl border border-stone-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-stone-100">
                  <h3 className="text-xl font-display font-bold text-stone-800">Mövcud Məhsullar</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-stone-50 text-stone-500 text-xs font-bold uppercase tracking-wider">
                        <th className="px-6 py-4">Məhsul</th>
                        <th className="px-6 py-4">Kateqoriya</th>
                        <th className="px-6 py-4">Qiymət</th>
                        <th className="px-6 py-4">Stok</th>
                        <th className="px-6 py-4 text-right">Əməliyyatlar</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100">
                      {products.map((product) => (
                        <tr key={product.id} className="hover:bg-stone-50 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <img src={product.image} alt={product.name} className="w-10 h-10 rounded-lg object-cover" />
                              <span className="font-bold text-stone-800">{product.name}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="px-3 py-1 bg-stone-100 text-stone-600 rounded-full text-xs font-bold capitalize">
                              {product.category}
                            </span>
                          </td>
                          <td className="px-6 py-4 font-bold text-primary-600">
                            {product.price} AZN / {product.unit}
                          </td>
                          <td className="px-6 py-4 text-stone-600">
                            {product.stock} {product.unit}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button 
                                onClick={() => setEditingProduct(product)}
                                className="p-2 text-stone-600 hover:bg-stone-100 rounded-lg transition-colors"
                                title="Redaktə et"
                              >
                                <Edit2 size={18} />
                              </button>
                              <button 
                                onClick={() => handleDeleteProduct(product.id)}
                                className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                title="Sil"
                              >
                                <Trash2 size={18} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'admin-panel' && isAdmin && (
            <AdminPanel />
          )}

          {activeTab === 'admin-orders' && isAdmin && (
            <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="bg-white rounded-3xl border border-stone-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-stone-100 flex items-center justify-between">
                  <h3 className="text-xl font-display font-bold text-stone-800">Bütün Sifarişlər</h3>
                  <span className="px-3 py-1 bg-primary-50 text-primary-600 rounded-full text-xs font-bold">
                    Cəmi: {allOrders.length}
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-stone-50 text-stone-500 text-xs font-bold uppercase tracking-wider">
                        <th className="px-6 py-4">Müştəri</th>
                        <th className="px-6 py-4">Məhsul</th>
                        <th className="px-6 py-4">Status</th>
                        <th className="px-6 py-4">Çatdırılma Vaxtı</th>
                        <th className="px-6 py-4 text-right">Əməliyyatlar</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100">
                      {allOrders.map((order) => (
                        <tr key={order.id} className="hover:bg-stone-50 transition-colors">
                          <td className="px-6 py-4">
                            <div className="space-y-1">
                              <p className="font-bold text-stone-800">{order.customerName}</p>
                              <p className="text-xs text-stone-500 flex items-center gap-1">
                                <Phone size={12} /> {order.phone}
                              </p>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="space-y-1">
                              <p className="font-medium text-stone-800">{order.productName}</p>
                              <p className="text-xs text-primary-600 font-bold">{order.price} AZN</p>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <select 
                              value={order.status}
                              onChange={(e) => updateOrder(order.id, { status: e.target.value })}
                              className={`text-xs font-bold px-3 py-1 rounded-full border-none outline-none cursor-pointer ${
                                order.status === 'completed' ? 'bg-green-100 text-green-600' :
                                order.status === 'processing' ? 'bg-blue-100 text-blue-600' :
                                order.status === 'cancelled' ? 'bg-red-100 text-red-600' :
                                'bg-amber-100 text-amber-600'
                              }`}
                            >
                              <option value="pending">Gözləyir</option>
                              <option value="processing">Hazırlanır</option>
                              <option value="completed">Tamamlandı</option>
                              <option value="cancelled">Ləğv edildi</option>
                            </select>
                          </td>
                          <td className="px-6 py-4">
                            <input 
                              type="text" 
                              placeholder="Məs: 2 saat ərzində"
                              defaultValue={order.estimatedDelivery || ''}
                              onBlur={(e) => updateOrder(order.id, { estimatedDelivery: e.target.value })}
                              className="text-xs px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none w-full max-w-[150px]"
                            />
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {order.status === 'pending' && (
                                <button 
                                  onClick={() => updateOrder(order.id, { status: 'processing' })}
                                  className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                                  title="Təsdiqlə"
                                >
                                  <CheckCircle2 size={18} />
                                </button>
                              )}
                              <button 
                                onClick={() => {
                                  if(window.confirm('Bu sifarişi silmək istədiyinizə əminsiniz?')) {
                                    deleteOrder(order.id);
                                  }
                                }}
                                className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                title="Sil"
                              >
                                <Trash2 size={18} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
          </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}

function NavItem({ icon, label, active, onClick, showLabel, className = "" }: { icon: React.ReactNode, label: string, active: boolean, onClick: () => void, showLabel: boolean, className?: string }) {
  return (
    <button 
      onClick={onClick}
      className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all duration-200 ${
        active 
          ? 'bg-primary-50 text-primary-700 font-semibold' 
          : 'text-stone-500 hover:bg-stone-50 hover:text-stone-800'
      } ${className}`}
    >
      <span className={`${active ? 'text-primary-600' : 'text-stone-400'}`}>{icon}</span>
      {showLabel && <span className="whitespace-nowrap">{label}</span>}
    </button>
  );
}

function StatCard({ icon, label, value, trend }: { icon: React.ReactNode, label: string, value: string, trend: string }) {
  return (
    <div className="bg-white p-4 sm:p-6 rounded-3xl border border-stone-200 shadow-sm hover:shadow-md">
      <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-stone-50 flex items-center justify-center mb-3 sm:mb-4">
        {icon}
      </div>
      <p className="text-stone-500 text-[10px] sm:text-sm font-medium mb-1 truncate">{label}</p>
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-1">
        <h4 className="text-lg sm:text-2xl font-display font-bold text-stone-800">{value}</h4>
        <span className={`text-[10px] sm:text-xs font-bold px-2 py-0.5 sm:py-1 rounded-full w-fit ${
          trend.startsWith('+') ? 'bg-emerald-50 text-emerald-600' : 'bg-stone-100 text-stone-500'
        }`}>
          {trend}
        </span>
      </div>
    </div>
  );
}

function EventItem({ date, title, type }: { date: string, title: string, type: string }) {
  return (
    <div className="flex items-center gap-4 group cursor-pointer">
      <div className="text-center min-w-[50px]">
        <p className="text-xs font-bold text-stone-400 uppercase">{date.split(' ')[1]}</p>
        <p className="text-lg font-display font-bold text-stone-800">{date.split(' ')[0]}</p>
      </div>
      <div className="flex-1 p-3 rounded-2xl bg-stone-50 group-hover:bg-stone-100">
        <p className="text-sm font-semibold text-stone-800">{title}</p>
        <p className="text-xs text-stone-500 capitalize">{type}</p>
      </div>
      <ChevronRight size={16} className="text-stone-300 group-hover:text-stone-500" />
    </div>
  );
}

function CategoryCard({ title, desc, img, onClick }: { title: string, desc: string, img: string, onClick: () => void }) {
  return (
    <div 
      onClick={onClick}
      className="relative h-64 rounded-3xl overflow-hidden cursor-pointer group"
    >
      <img src={img} alt={title} className="absolute inset-0 w-full h-full object-cover group-hover:scale-110" referrerPolicy="no-referrer" />
      <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20" />
      <div className="absolute inset-0 p-8 flex flex-col justify-end">
        <h4 className="text-2xl font-display font-bold text-white mb-2">{title}</h4>
        <p className="text-white/80 text-sm">{desc}</p>
      </div>
    </div>
  );
}

function StatusViewer({ 
  products, 
  currentIndex, 
  progress, 
  onClose, 
  onOrder,
  setCurrentStatusIndex,
  setStatusProgress
}: { 
  products: Product[], 
  currentIndex: number, 
  progress: number, 
  onClose: () => void, 
  onOrder: (product: Product) => void,
  setCurrentStatusIndex: (index: number) => void,
  setStatusProgress: (progress: number) => void
}) {
  const currentProduct = products[currentIndex];
  if (!currentProduct) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center animate-in fade-in duration-300">
      {/* Progress bars */}
      <div className="absolute top-4 left-4 right-4 flex gap-1 z-30">
        {products.map((_, idx) => (
          <div key={idx} className="h-1 flex-1 bg-white/20 rounded-full overflow-hidden">
            <div 
              className="h-full bg-white transition-all duration-50"
              style={{ 
                width: idx === currentIndex ? `${progress}%` : idx < currentIndex ? '100%' : '0%' 
              }}
            />
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="absolute top-8 left-4 right-4 flex items-center justify-between z-30">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full border-2 border-primary-500 p-0.5">
            <img src={currentProduct.image} className="w-full h-full rounded-full object-cover" referrerPolicy="no-referrer" />
          </div>
          <div>
            <p className="text-white font-bold text-sm">{currentProduct.name}</p>
            <p className="text-white/60 text-[10px]">{formatDate(currentProduct.createdAt)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => {
              if (currentIndex > 0) {
                setCurrentStatusIndex(currentIndex - 1);
                setStatusProgress(0);
              }
            }}
            className="text-white/50 hover:text-white p-2"
          >
            <ChevronLeft size={24} />
          </button>
          <button 
            onClick={() => {
              if (currentIndex < products.length - 1) {
                setCurrentStatusIndex(currentIndex + 1);
                setStatusProgress(0);
              } else {
                onClose();
              }
            }}
            className="text-white/50 hover:text-white p-2"
          >
            <ChevronRight size={24} />
          </button>
          <button onClick={onClose} className="text-white p-2">
            <X size={24} />
          </button>
        </div>
      </div>

      {/* Image */}
      <div className="w-full h-full flex items-center justify-center p-4 relative">
        {/* Click areas for navigation */}
        <div 
          className="absolute inset-y-0 left-0 w-1/3 z-20 cursor-pointer" 
          onClick={() => {
            if (currentIndex > 0) {
              setCurrentStatusIndex(currentIndex - 1);
              setStatusProgress(0);
            }
          }}
        />
        <div 
          className="absolute inset-y-0 right-0 w-1/3 z-20 cursor-pointer" 
          onClick={() => {
            if (currentIndex < products.length - 1) {
              setCurrentStatusIndex(currentIndex + 1);
              setStatusProgress(0);
            } else {
              onClose();
            }
          }}
        />
        
        <motion.img 
          key={currentProduct.id}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          src={currentProduct.image} 
          alt={currentProduct.name} 
          className="max-w-full max-h-[70vh] object-contain rounded-2xl shadow-2xl relative z-10"
          referrerPolicy="no-referrer"
        />
      </div>

      {/* Footer / Order Button */}
      <div className="absolute bottom-0 left-0 right-0 pb-10 pt-20 bg-gradient-to-t from-black/90 via-black/40 to-transparent flex flex-col items-center gap-4 z-30 px-6">
        <motion.button 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
          onClick={() => {
            onOrder(currentProduct);
            onClose();
          }}
          className="px-8 py-3 bg-white text-black rounded-full font-bold shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center gap-2 mb-2"
        >
          <ShoppingBag size={20} /> İndi sifariş et
        </motion.button>
        
        {currentProduct.description && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="max-w-md text-center"
          >
            <p className="text-white text-sm sm:text-base leading-relaxed font-medium drop-shadow-md">
              {currentProduct.description}
            </p>
          </motion.div>
        )}
        
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.4 }}
          transition={{ delay: 0.7 }}
          className="flex flex-col items-center gap-1"
        >
           <ChevronUp size={16} className="text-white animate-bounce" />
           <p className="text-white text-[10px] uppercase tracking-widest font-bold">Sifariş üçün klikləyin</p>
        </motion.div>
      </div>
    </div>
  );
}

function ProductCard({ product, onOrder, isAdmin, onEdit }: { 
  product: Product, 
  onOrder?: () => void,
  isAdmin?: boolean,
  onEdit?: () => void
}) {
  const handleImageClick = async () => {
    if (isAdmin) {
      const newUrl = window.prompt('Yeni şəkil URL-ni daxil edin:', product.image || '');
      if (newUrl !== null && newUrl !== product.image) {
        try {
          const { doc, updateDoc } = await import('firebase/firestore');
          const { db } = await import('./firebase');
          await updateDoc(doc(db, 'products', product.id), { image: newUrl });
          toast.success('Şəkil yeniləndi.');
        } catch (error) {
          console.error('Error updating product image:', error);
          toast.error('Şəkil yenilənərkən xəta baş verdi.');
        }
      }
    }
  };

  const handleOrder = () => {
    const message = `Salam, ${product.name} məhsulu haqqında maraqlanıram.`;
    const phone = product.sellerPhone || '994556651665';
    const waUrl = `https://wa.me/${phone.replace(/\s+/g, '')}?text=${encodeURIComponent(message)}`;
    window.open(waUrl, '_blank');
  };

  return (
    <div className="bg-white rounded-2xl overflow-hidden border border-stone-200 shadow-sm hover:shadow-md group flex flex-col h-full">
      <div 
        className={`relative aspect-[4/3] overflow-hidden ${isAdmin ? 'cursor-pointer' : ''}`}
        onClick={handleImageClick}
      >
        <img 
          src={product.image} 
          alt={product.name} 
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          referrerPolicy="no-referrer"
        />
        {isAdmin && (
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <div className="bg-white/90 p-2 rounded-full text-stone-800 shadow-lg">
              <Camera size={20} />
            </div>
          </div>
        )}
        <div className="absolute top-2 right-2 px-2 py-0.5 bg-white/90 backdrop-blur-sm rounded-full text-[10px] font-bold text-stone-600 shadow-sm">
          {product.category === 'bitki' ? 'Bitki' : product.category === 'quş' ? 'Quş' : 'Digər'}
        </div>
      </div>
      <div className="p-3 flex flex-col flex-1">
        <div className="mb-1 flex justify-between items-center">
          <div>
            <span className="text-lg font-display font-bold text-primary-600">{product.price} ₼</span>
            <span className="text-stone-400 text-[10px] ml-1">/ {product.unit}</span>
          </div>
          {isAdmin && onEdit && (
            <button onClick={onEdit} className="p-1.5 bg-stone-100 rounded-full text-stone-600 hover:bg-stone-200">
                <Edit2 size={14} />
            </button>
          )}
        </div>
        <h5 className="font-sans font-medium text-sm text-stone-800 line-clamp-2 leading-tight mb-1 flex-1">{product.name}</h5>
        <p className="text-[10px] text-stone-400 mb-2 flex items-center gap-1">
          <Clock size={10} /> {formatDate(product.createdAt)}
        </p>
        <button 
          onClick={onOrder}
          className="w-full py-1.5 bg-stone-50 hover:bg-primary-600 hover:text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
        >
          <ShoppingBag size={14} /> Sifariş
        </button>
      </div>
    </div>
  );
}

function EditProductModal({ product, onClose, onUpdate }: { 
  product: Product, 
  onClose: () => void, 
  onUpdate: (productId: string, updates: Partial<Omit<Product, 'id'>>) => void
}) {
  const [formData, setFormData] = useState<Partial<Omit<Product, 'id'>>>({
    name: product.name,
    price: product.price,
    unit: product.unit,
    category: product.category,
    image: product.image
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('handleSubmit called', formData);
    onUpdate(product.id, formData);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 bg-stone-900/60 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden">
        <div className="p-6 border-b border-stone-100 flex items-center justify-between">
          <h3 className="text-xl font-display font-bold text-stone-800 uppercase tracking-wide">Məhsulu Redaktə Et</h3>
          <button onClick={onClose} className="p-2 hover:bg-stone-100 rounded-full text-stone-400">
            <X size={20} />
          </button>
        </div>
        
        <div className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-stone-500 uppercase ml-1">Ad</label>
              <input 
                required
                type="text" 
                className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            
            <div className="flex gap-4">
                <div className="space-y-1.5 flex-1">
                <label className="text-xs font-bold text-stone-500 uppercase ml-1">Qiymət</label>
                <input 
                    required
                    type="number" 
                    step="0.01"
                    className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) })}
                />
                </div>
                <div className="space-y-1.5 flex-1">
                <label className="text-xs font-bold text-stone-500 uppercase ml-1">Vahid</label>
                <input 
                    required
                    type="text" 
                    className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                />
                </div>
            </div>

            <button 
              type="submit"
              className="w-full py-4 bg-primary-600 text-white rounded-2xl font-bold hover:bg-primary-700 shadow-lg shadow-primary-600/20 flex items-center justify-center gap-2"
            >
              Yadda Saxla
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

function OrderModal({ product, status, onClose, onSubmit, setStatus, user }: { 
  product: Product, 
  status: 'idle' | 'submitting' | 'success' | 'error',
  onClose: () => void, 
  onSubmit: (data: OrderFormData) => void,
  setStatus: (status: 'idle' | 'submitting' | 'success' | 'error') => void,
  user: User | null
}) {
  const [formData, setFormData] = useState<OrderFormData>({ 
    fullName: user?.displayName || '', 
    phone: user?.phoneNumber || '' 
  });
  const [isZoomed, setIsZoomed] = useState(false);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [lightboxScale, setLightboxScale] = useState(1);

  useEffect(() => {
    if (user) {
      setFormData(prev => ({
        ...prev,
        fullName: user.displayName || prev.fullName,
        phone: user.phoneNumber || prev.phone
      }));
    }
  }, [user]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.fullName || !formData.phone) return;
    onSubmit(formData);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-stone-900/80 backdrop-blur-md" 
        onClick={onClose} 
      />
      
      <motion.div 
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        className="relative bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col md:flex-row"
      >
        {status === 'success' ? (
          <div className="p-12 text-center space-y-6 w-full">
            <motion.div 
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="w-24 h-24 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner"
            >
              <Sparkles size={48} />
            </motion.div>
            <div className="space-y-2">
              <h3 className="text-3xl font-display font-bold text-stone-800">Sifarişiniz Qəbul Edildi!</h3>
              <p className="text-stone-500 text-lg">Tezliklə sizinlə əlaqə saxlanılacaq.</p>
            </div>
          </div>
        ) : status === 'error' ? (
          <div className="p-12 text-center space-y-6 w-full">
            <div className="w-24 h-24 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
              <X size={48} />
            </div>
            <div className="space-y-2">
              <h3 className="text-3xl font-display font-bold text-stone-800">Xəta Baş Verdi</h3>
              <p className="text-stone-500 text-lg">Sifariş göndərilə bilmədi. Zəhmət olmasa yenidən cəhd edin.</p>
            </div>
            <button 
              onClick={() => setStatus('idle')}
              className="w-full py-4 bg-stone-100 text-stone-800 rounded-2xl font-bold hover:bg-stone-200 transition-colors"
            >
              Yenidən Cəhd Et
            </button>
          </div>
        ) : (
          <>
            {/* Left Side: Image Section */}
            <div className="w-full md:w-1/2 bg-stone-50 relative group overflow-hidden h-64 md:h-auto">
              <motion.img 
                animate={{ scale: isZoomed ? 1.5 : 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                src={product.image} 
                alt={product.name} 
                className="w-full h-full object-cover cursor-zoom-in"
                onClick={() => setIsLightboxOpen(true)}
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
              <div className="absolute bottom-6 left-6 right-6 text-white pointer-events-none">
                <p className="text-xs font-bold uppercase tracking-widest opacity-80 mb-1">{product.category}</p>
                <h4 className="text-2xl font-display font-bold leading-tight">{product.name}</h4>
                <p className="text-2xl font-bold text-primary-400 mt-2">{product.price} ₼ <span className="text-sm font-normal opacity-70">/ {product.unit}</span></p>
              </div>
              <button 
                onClick={() => setIsLightboxOpen(true)}
                className="absolute top-4 right-4 p-3 bg-white/20 backdrop-blur-md rounded-2xl text-white hover:bg-white/40 transition-all shadow-lg"
              >
                <Search size={20} />
              </button>
            </div>

            {/* Full Screen Lightbox */}
            <AnimatePresence>
              {isLightboxOpen && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-4 md:p-10"
                  onClick={() => {
                    setIsLightboxOpen(false);
                    setLightboxScale(1);
                  }}
                >
                  <motion.button 
                    initial={{ y: -20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    className="absolute top-6 right-6 p-4 bg-white/10 hover:bg-white/20 rounded-full text-white transition-all z-[101]"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsLightboxOpen(false);
                      setLightboxScale(1);
                    }}
                  >
                    <X size={32} />
                  </motion.button>

                  <motion.div 
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    className="relative max-w-5xl w-full h-full flex items-center justify-center"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <motion.img 
                      drag
                      dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
                      dragElastic={0.1}
                      animate={{ scale: lightboxScale }}
                      onClick={() => setLightboxScale(lightboxScale === 1 ? 2 : 1)}
                      src={product.image} 
                      alt={product.name} 
                      className="max-w-full max-h-full object-contain shadow-2xl rounded-lg cursor-zoom-in"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-white/10 backdrop-blur-md px-6 py-3 rounded-full text-white text-sm font-medium border border-white/10 flex items-center gap-4">
                      <span>Şəkili yaxınlaşdırmaq üçün üzərinə vurun</span>
                      <div className="w-px h-4 bg-white/20" />
                      <button 
                        onClick={() => setLightboxScale(lightboxScale === 1 ? 2 : 1)}
                        className="text-primary-400 font-bold"
                      >
                        {lightboxScale === 1 ? 'Böyüt' : 'Kiçilt'}
                      </button>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Right Side: Form Section */}
            <div className="w-full md:w-1/2 p-8 md:p-10 flex flex-col">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-2xl font-display font-bold text-stone-800">Sifariş Formu</h3>
                <button onClick={onClose} className="p-2 hover:bg-stone-100 rounded-full text-stone-400 transition-colors">
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6 flex-1">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest ml-1">Ad Soyad</label>
                    <div className="relative">
                      <input 
                        required
                        type="text" 
                        readOnly={!!user}
                        placeholder="Məs: Əli Məmmədov"
                        className={`w-full px-5 py-4 bg-stone-50 border border-stone-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all ${user ? 'opacity-70 cursor-not-allowed' : ''}`}
                        value={formData.fullName}
                        onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                      />
                      {user && (
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 text-emerald-500">
                          <CheckCircle2 size={18} />
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest ml-1">Əlaqə Nömrəsi</label>
                    <input 
                      required
                      type="tel" 
                      placeholder="Məs: 050 123 45 67"
                      className="w-full px-5 py-4 bg-stone-50 border border-stone-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-3 pt-4">
                  <button 
                    type="submit"
                    disabled={status === 'submitting'}
                    className="w-full py-5 bg-primary-600 text-white rounded-[1.25rem] font-bold text-lg hover:bg-primary-700 shadow-xl shadow-primary-600/20 flex items-center justify-center gap-3 disabled:opacity-50 transition-all active:scale-95"
                  >
                    {status === 'submitting' ? (
                      <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>Sifarişi Tamamla <ArrowRight size={22} /></>
                    )}
                  </button>

                  <div className="relative py-2">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t border-stone-100"></span>
                    </div>
                    <div className="relative flex justify-center text-[10px] uppercase tracking-widest font-bold">
                      <span className="bg-white px-4 text-stone-300">Və ya</span>
                    </div>
                  </div>

                  <button 
                    type="button"
                    onClick={() => {
                      const message = `Salam, ${product.name} məhsulu haqqında maraqlanıram.`;
                      const phone = product.sellerPhone || '994556651665';
                      const waUrl = `https://wa.me/${phone.replace(/\s+/g, '')}?text=${encodeURIComponent(message)}`;
                      window.open(waUrl, '_blank');
                    }}
                    className="w-full py-4 bg-emerald-500 text-white rounded-[1.25rem] font-bold hover:bg-emerald-600 shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-3 transition-all active:scale-95"
                  >
                    <MessageCircle size={20} /> WhatsApp ilə Sifariş
                  </button>
                </div>
              </form>
              
              <p className="text-[10px] text-stone-400 text-center mt-6 uppercase tracking-tighter">
                Təhlükəsiz ödəniş və sürətli çatdırılma zəmanəti
              </p>
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
}
