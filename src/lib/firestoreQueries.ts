import { collection, getDocs, query, where, orderBy, Timestamp } from 'firebase/firestore'
import { db } from './firebase'

export interface FirestoreAdvance {
  id: string
  supplier_id: string
  supplier_name: string
  amount: number
  recovered: number
  balance: number
  date: Date
  status: string
  notes?: string
  created_at: Date
  updated_at: Date
}

export interface FirestoreCoffeeLot {
  id: string
  batch_number: string
  supplier_id: string
  supplier_name: string
  kilograms: number
  price_per_kg: number
  total_amount: number
  advance_deduction: number
  net_amount: number
  payment_status: string
  date: Date
  created_at: Date
}

export const fetchSupplierAdvances = async (): Promise<FirestoreAdvance[]> => {
  try {
    const advancesRef = collection(db, 'supplier_advances')
    const q = query(advancesRef, orderBy('created_at', 'desc'))
    const snapshot = await getDocs(q)

    return snapshot.docs.map(doc => {
      const data = doc.data()
      return {
        id: doc.id,
        supplier_id: data.supplier_id || '',
        supplier_name: data.supplier_name || '',
        amount: Number(data.amount || 0),
        recovered: Number(data.recovered || 0),
        balance: Number(data.balance || 0),
        date: data.date instanceof Timestamp ? data.date.toDate() : new Date(data.date),
        status: data.status || 'active',
        notes: data.notes,
        created_at: data.created_at instanceof Timestamp ? data.created_at.toDate() : new Date(data.created_at),
        updated_at: data.updated_at instanceof Timestamp ? data.updated_at.toDate() : new Date(data.updated_at)
      }
    })
  } catch (error) {
    console.error('Error fetching supplier advances from Firestore:', error)
    return []
  }
}

export const fetchPendingSupplierAdvances = async (supplierId?: string): Promise<FirestoreAdvance[]> => {
  try {
    const advancesRef = collection(db, 'supplier_advances')
    let q = query(
      advancesRef,
      where('status', '==', 'active'),
      orderBy('created_at', 'desc')
    )

    if (supplierId) {
      q = query(
        advancesRef,
        where('supplier_id', '==', supplierId),
        where('status', '==', 'active'),
        orderBy('created_at', 'desc')
      )
    }

    const snapshot = await getDocs(q)

    return snapshot.docs.map(doc => {
      const data = doc.data()
      return {
        id: doc.id,
        supplier_id: data.supplier_id || '',
        supplier_name: data.supplier_name || '',
        amount: Number(data.amount || 0),
        recovered: Number(data.recovered || 0),
        balance: Number(data.balance || 0),
        date: data.date instanceof Timestamp ? data.date.toDate() : new Date(data.date),
        status: data.status || 'active',
        notes: data.notes,
        created_at: data.created_at instanceof Timestamp ? data.created_at.toDate() : new Date(data.created_at),
        updated_at: data.updated_at instanceof Timestamp ? data.updated_at.toDate() : new Date(data.updated_at)
      }
    }).filter(advance => advance.balance > 0)
  } catch (error) {
    console.error('Error fetching pending advances from Firestore:', error)
    return []
  }
}

export const fetchCoffeeLots = async (paymentStatus?: string): Promise<FirestoreCoffeeLot[]> => {
  try {
    const lotsRef = collection(db, 'coffee_lots')
    let q = query(lotsRef, orderBy('created_at', 'desc'))

    if (paymentStatus) {
      q = query(
        lotsRef,
        where('payment_status', '==', paymentStatus),
        orderBy('created_at', 'desc')
      )
    }

    const snapshot = await getDocs(q)

    return snapshot.docs.map(doc => {
      const data = doc.data()
      return {
        id: doc.id,
        batch_number: data.batch_number || '',
        supplier_id: data.supplier_id || '',
        supplier_name: data.supplier_name || '',
        kilograms: Number(data.kilograms || 0),
        price_per_kg: Number(data.price_per_kg || 0),
        total_amount: Number(data.total_amount || 0),
        advance_deduction: Number(data.advance_deduction || 0),
        net_amount: Number(data.net_amount || 0),
        payment_status: data.payment_status || 'pending',
        date: data.date instanceof Timestamp ? data.date.toDate() : new Date(data.date),
        created_at: data.created_at instanceof Timestamp ? data.created_at.toDate() : new Date(data.created_at)
      }
    })
  } catch (error) {
    console.error('Error fetching coffee lots from Firestore:', error)
    return []
  }
}

export const getSupplierAdvanceBalance = async (supplierId: string): Promise<number> => {
  try {
    const advances = await fetchPendingSupplierAdvances(supplierId)
    return advances.reduce((total, advance) => total + advance.balance, 0)
  } catch (error) {
    console.error('Error calculating supplier advance balance:', error)
    return 0
  }
}
