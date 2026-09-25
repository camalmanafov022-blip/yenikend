import React, { useEffect, useState } from 'react';
import { db, collection, onSnapshot, doc, updateDoc, deleteDoc, updateUserSaleStatus, updateUserSaleImage } from '../firebase';
import { User, Check, X, Clock, Trash2, ExternalLink, MessageCircle, Camera } from 'lucide-react';
import { UserSale } from '../types';
import { toast } from 'sonner';

export default function AdminPanel() {
  const [users, setUsers] = useState<any[]>([]);
  const [sales, setSales] = useState<UserSale[]>([]);
  const [activeTab, setActiveTab] = useState<'users' | 'sales'>('sales');

  useEffect(() => {
    const unsubUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      const usersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setUsers(usersData);
    });

    const unsubSales = onSnapshot(collection(db, 'user_sales'), (snapshot) => {
      const salesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as UserSale[];
      // Sort by date descending
      setSales(salesData.sort((a, b) => {
        const dateA = a.createdAt?.seconds || 0;
        const dateB = b.createdAt?.seconds || 0;
        return dateB - dateA;
      }));
    });

    return () => {
      unsubUsers();
      unsubSales();
    };
  }, []);

  const toggleAdmin = async (userId: string, currentRole: string) => {
    try {
      const newRole = currentRole === 'admin' ? 'user' : 'admin';
      await updateDoc(doc(db, 'users', userId), { role: newRole });
      toast.success('İstifadəçi rolu yeniləndi.');
    } catch (error) {
      console.error('Error toggling admin role:', error);
      toast.error('İstifadəçi rolunu dəyişərkən xəta baş verdi.');
    }
  };

  const handleSaleAction = async (saleId: string, status: 'approved' | 'rejected') => {
    try {
      await updateUserSaleStatus(saleId, status);
      toast.success(status === 'approved' ? 'Elan təsdiqləndi.' : 'Elan rədd edildi.');
    } catch (error) {
      console.error('Error updating sale status:', error);
      toast.error('Status yenilənərkən xəta baş verdi.');
    }
  };

  const deleteSale = async (saleId: string) => {
    if (window.confirm('Bu elanı silmək istədiyinizə əminsiniz?')) {
      try {
        await deleteDoc(doc(db, 'user_sales', saleId));
        toast.success('Elan silindi.');
      } catch (error) {
        console.error('Error deleting sale:', error);
        toast.error('Elan silinərkən xəta baş verdi.');
      }
    }
  };

  const handleUpdateImage = async (saleId: string, currentImage: string) => {
    const newUrl = window.prompt('Yeni şəkil URL-ni daxil edin:', currentImage || '');
    if (newUrl !== null && newUrl !== currentImage) {
      try {
        await updateUserSaleImage(saleId, newUrl);
        toast.success('Şəkil yeniləndi.');
      } catch (error) {
        console.error('Error updating image:', error);
        toast.error('Şəkil yenilənərkən xəta baş verdi.');
      }
    }
  };

  const contactSeller = (sale: UserSale) => {
    const message = `Salam, ${sale.orderNumber} nömrəli ${sale.name} elanınız haqqında yazıram.`;
    const waUrl = `https://wa.me/${sale.phone || '994556651665'}?text=${encodeURIComponent(message)}`;
    window.open(waUrl, '_blank');
  };

  return (
    <div className="p-6 bg-white rounded-3xl border border-stone-200 shadow-sm">
      <div className="flex items-center gap-4 mb-8 border-b border-stone-100 pb-4">
        <button 
          onClick={() => setActiveTab('sales')}
          className={`px-6 py-2 rounded-xl font-bold transition-all ${activeTab === 'sales' ? 'bg-red-600 text-white shadow-lg shadow-red-600/20' : 'text-stone-500 hover:bg-stone-100'}`}
        >
          Elanlar ({sales.length})
        </button>
        <button 
          onClick={() => setActiveTab('users')}
          className={`px-6 py-2 rounded-xl font-bold transition-all ${activeTab === 'users' ? 'bg-red-600 text-white shadow-lg shadow-red-600/20' : 'text-stone-500 hover:bg-stone-100'}`}
        >
          İstifadəçilər
        </button>
      </div>

      {activeTab === 'users' ? (
        <div className="space-y-4">
          <h3 className="text-xl font-bold mb-4">İstifadəçilər</h3>
          {users.map(user => (
            <div key={user.id} className="flex items-center justify-between p-4 bg-stone-50 rounded-xl border border-stone-100">
              <div className="flex items-center gap-3">
                <User className="text-stone-400" />
                <div>
                  <p className="font-bold">{user.email}</p>
                  <p className="text-sm text-stone-500">{user.role}</p>
                </div>
              </div>
              <button 
                onClick={() => toggleAdmin(user.id, user.role)}
                className={`px-4 py-2 rounded-lg font-bold text-sm ${user.role === 'admin' ? 'bg-red-100 text-red-600' : 'bg-primary-100 text-primary-600'}`}
              >
                {user.role === 'admin' ? 'Admini çıxar' : 'Admin et'}
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-6">
          <h3 className="text-xl font-bold mb-4">Məhsul Elanları</h3>
          {sales.length === 0 ? (
            <div className="text-center py-12 text-stone-400">
              <Clock size={48} className="mx-auto mb-4 opacity-20" />
              <p>Hələ ki elan yoxdur.</p>
            </div>
          ) : (
            <div className="grid gap-6">
              {sales.map(sale => (
                <div key={sale.id} className={`p-5 rounded-2xl border transition-all ${sale.status === 'pending' ? 'bg-white border-red-100 shadow-md' : 'bg-stone-50 border-stone-100 opacity-75'}`}>
                  <div className="flex gap-5">
                    <div 
                      className="w-24 h-24 rounded-xl overflow-hidden flex-shrink-0 bg-stone-50 border border-stone-100 flex items-center justify-center relative group cursor-pointer"
                      onClick={() => handleUpdateImage(sale.id, sale.image || '')}
                      title="Şəkli dəyiş (URL)"
                    >
                      {sale.image ? (
                        <img src={sale.image} alt={sale.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="flex flex-col items-center justify-center p-2 text-center">
                          <div className="relative mb-1.5">
                            <MessageCircle size={20} className="text-red-400 animate-pulse" />
                            <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full border border-white" />
                          </div>
                          <span className="text-[9px] font-bold text-stone-400 leading-tight uppercase tracking-tighter">
                            İstifadəçinin şəkilləri gözlənilir
                          </span>
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Camera size={16} className="text-white" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="bg-stone-100 text-stone-600 px-2 py-0.5 rounded text-[10px] font-mono font-bold">
                              {sale.orderNumber}
                            </span>
                            <h4 className="font-bold text-lg truncate">{sale.name}</h4>
                          </div>
                          <p className="text-red-600 font-bold">{sale.price} ₼ / {sale.unit}</p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                          sale.status === 'approved' ? 'bg-green-100 text-green-600' : 
                          sale.status === 'rejected' ? 'bg-red-100 text-red-600' : 
                          'bg-amber-100 text-amber-600'
                        }`}>
                          {sale.status === 'approved' ? 'Təsdiqlənib' : sale.status === 'rejected' ? 'Rədd edilib' : 'Gözləyir'}
                        </span>
                      </div>
                      <p className="text-sm text-stone-600 line-clamp-2 mb-3">{sale.description}</p>
                      <div className="flex items-center justify-between text-xs text-stone-400">
                        <div>
                          <p>Göndərən: {sale.userName} ({sale.userEmail})</p>
                          <p>Tel: {sale.phone}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => contactSeller(sale)}
                            className="p-2 bg-stone-100 text-stone-600 rounded-lg hover:bg-stone-200 transition-all"
                            title="WhatsApp-a keç"
                          >
                            <MessageCircle size={16} />
                          </button>
                          {/* Buttons removed */}
                          <button 
                            onClick={() => deleteSale(sale.id!)}
                            className="p-2 bg-stone-200 text-stone-600 rounded-lg hover:bg-stone-300 transition-all"
                            title="Sil"
                          >
                            <Trash2 size={16} />
                          </button>
                          <button 
                            onClick={() => contactSeller(sale)}
                            className="p-2 bg-green-100 text-green-600 rounded-lg hover:bg-green-200 transition-all"
                            title="WhatsApp ilə əlaqə"
                          >
                            <MessageCircle size={16} />
                          </button>
                          <a 
                            href={sale.image} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="p-2 bg-stone-200 text-stone-600 rounded-lg hover:bg-stone-300 transition-all"
                            title="Şəkli aç"
                          >
                            <ExternalLink size={16} />
                          </a>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
