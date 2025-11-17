import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';

export interface FinanceNotification {
  id: string;
  type: 'approval_request' | 'system' | 'announcement' | 'reminder' | 'payment_ready';
  title: string;
  message: string;
  priority: 'High' | 'Medium' | 'Low';
  is_read: boolean;
  sender_name?: string;
  sender_email?: string;
  target_role?: string;
  target_user_email?: string;
  metadata?: any;
  created_at: string;
  read_at?: string;
}

export function useFinanceNotifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<FinanceNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.email) {
      setLoading(false);
      return;
    }

    fetchNotifications();

    const channel = supabase
      .channel('finance_notifications_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'finance_notifications',
        },
        () => {
          fetchNotifications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.email]);

  async function fetchNotifications() {
    try {
      const { data, error } = await supabase
        .from('finance_notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      const filtered = (data || []).filter((notif: FinanceNotification) => {
        if (notif.target_user_email && notif.target_user_email !== user?.email) {
          return false;
        }
        return true;
      });

      setNotifications(filtered);
      setUnreadCount(filtered.filter((n: FinanceNotification) => !n.is_read).length);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  }

  async function markAsRead(notificationId: string) {
    try {
      const { error } = await supabase
        .from('finance_notifications')
        .update({
          is_read: true,
          read_at: new Date().toISOString(),
        })
        .eq('id', notificationId);

      if (error) throw error;

      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notificationId
            ? { ...n, is_read: true, read_at: new Date().toISOString() }
            : n
        )
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  }

  async function markAllAsRead() {
    try {
      const unreadIds = notifications.filter((n) => !n.is_read).map((n) => n.id);

      if (unreadIds.length === 0) return;

      const { error } = await supabase
        .from('finance_notifications')
        .update({
          is_read: true,
          read_at: new Date().toISOString(),
        })
        .in('id', unreadIds);

      if (error) throw error;

      setNotifications((prev) =>
        prev.map((n) =>
          unreadIds.includes(n.id)
            ? { ...n, is_read: true, read_at: new Date().toISOString() }
            : n
        )
      );
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  }

  async function createNotification(
    title: string,
    message: string,
    options?: {
      type?: FinanceNotification['type'];
      priority?: 'High' | 'Medium' | 'Low';
      targetRole?: string;
      targetUserEmail?: string;
      metadata?: any;
    }
  ) {
    try {
      const { error } = await supabase.from('finance_notifications').insert({
        type: options?.type || 'system',
        title,
        message,
        priority: options?.priority || 'Medium',
        sender_name: user?.email?.split('@')[0] || 'System',
        sender_email: user?.email,
        target_role: options?.targetRole,
        target_user_email: options?.targetUserEmail,
        metadata: options?.metadata || {},
      });

      if (error) throw error;
    } catch (error) {
      console.error('Error creating notification:', error);
      throw error;
    }
  }

  return {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    createNotification,
    refresh: fetchNotifications,
  };
}
