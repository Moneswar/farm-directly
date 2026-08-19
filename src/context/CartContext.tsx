import React, { createContext, useContext, useEffect, useState } from 'react';
import { apiFetch } from '../services/api';
import { useAuth } from './AuthContext';
import { roundPrice } from '../utils/currency';

export interface CartItem {
  id: string;
  productId: string;
  product: any;
  quantity: number;
  priceAtAddition: number;
}

interface CartContextType {
  cartItems: CartItem[];
  wishlist: string[];
  appliedCoupon: string | null;
  discountPercent: number;
  maxDiscount: number;
  loading: boolean;
  addToCart: (productId: string, quantity?: number) => Promise<void>;
  updateQuantity: (productId: string, quantity: number) => Promise<void>;
  toggleWishlist: (productId: string) => Promise<boolean>;
  applyCoupon: (code: string) => Promise<{ success: boolean; message: string; discount?: number }>;
  removeCoupon: () => void;
  fetchCart: () => Promise<void>;
  cartSubtotal: number;
  cartCount: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [wishlist, setWishlist] = useState<string[]>([]);
  const [appliedCoupon, setAppliedCoupon] = useState<string | null>(null);
  const [discountPercent, setDiscountPercent] = useState<number>(0);
  const [maxDiscount, setMaxDiscount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);

  const fetchCart = async () => {
    if (!user) {
      setCartItems([]);
      setWishlist([]);
      return;
    }
    try {
      setLoading(true);
      const [cartRes, wishRes] = await Promise.all([
        apiFetch('/customer/cart').catch(() => null),
        apiFetch('/customer/wishlist').catch(() => null),
      ]);
      if (cartRes?.success) {
        setCartItems(cartRes.cart || []);
      }
      if (wishRes?.success) {
        setWishlist(wishRes.wishlist || []);
      }
    } catch (err) {
      console.error('Error fetching cart data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCart();
  }, [user]);

  const addToCart = async (productId: string, quantity = 1) => {
    if (!user) {
      alert('Please login to add items to your shopping cart!');
      return;
    }
    try {
      const res = await apiFetch('/customer/cart/add', {
        method: 'POST',
        body: JSON.stringify({ productId, quantity }),
      });
      if (res.success) {
        setCartItems(res.cart || []);
      }
    } catch (err: any) {
      console.error('Add to Cart Error:', err);
      alert(err.message || 'Failed to add item to cart');
    }
  };

  const updateQuantity = async (productId: string, quantity: number) => {
    try {
      const res = await apiFetch('/customer/cart/update', {
        method: 'PUT',
        body: JSON.stringify({ productId, quantity }),
      });
      if (res.success) {
        setCartItems(res.cart);
      }
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Failed to update quantity');
    }
  };

  const toggleWishlist = async (productId: string) => {
    if (!user) {
      alert('Please login to save favorite items!');
      return false;
    }
    try {
      const res = await apiFetch('/customer/wishlist/toggle', {
        method: 'POST',
        body: JSON.stringify({ productId }),
      });
      if (res.success) {
        setWishlist(res.wishlist || []);
        return res.isWishlisted;
      }
      return false;
    } catch (err: any) {
      console.error(err);
      return false;
    }
  };

  const cartSubtotal = roundPrice(
    cartItems.reduce((sum, item) => sum + roundPrice((item.product?.price || 0) * item.quantity), 0)
  );

  const applyCoupon = async (code: string) => {
    if (!code || !code.trim()) return { success: false, message: 'Please enter a coupon code' };
    const upper = code.trim().toUpperCase();

    try {
      const res = await apiFetch('/customer/coupon/validate', {
        method: 'POST',
        body: JSON.stringify({ code: upper, subtotal: cartSubtotal }),
      });

      if (res.success && res.coupon) {
        setAppliedCoupon(res.coupon.code);
        setDiscountPercent(res.coupon.discountPercentage || 0);
        setMaxDiscount(res.coupon.maxDiscount || 0);
        return {
          success: true,
          message: res.message || `Coupon ${res.coupon.code} applied!`,
          discount: res.coupon.discountPercentage,
        };
      } else {
        return { success: false, message: res.message || 'Invalid coupon code.' };
      }
    } catch (err: any) {
      return { success: false, message: err.message || 'Invalid or expired coupon code.' };
    }
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    setDiscountPercent(0);
    setMaxDiscount(0);
  };

  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        cartItems,
        wishlist,
        appliedCoupon,
        discountPercent,
        maxDiscount,
        loading,
        addToCart,
        updateQuantity,
        toggleWishlist,
        applyCoupon,
        removeCoupon,
        fetchCart,
        cartSubtotal,
        cartCount,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used within CartProvider');
  return context;
};
