# Firebase Integration

The Finance portal now integrates with Firebase Firestore to fetch legacy data from the traceability system while continuing to use Supabase as the primary database.

## Architecture

The system uses a **dual-database architecture**:

- **Supabase**: Primary database for all new finance data
- **Firestore**: Read-only access to legacy data from the traceability system

## Configuration

### Environment Variables

Add the following Firebase configuration to your `.env` file:

```env
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

**Important**: Use the exact same Firebase configuration from your traceability system. This ensures both systems access the same Firebase project.

## Implementation

### Files Created

1. **`src/lib/firebase.ts`**: Firebase initialization and Firestore client
   - Initializes Firebase app with environment variables
   - Exports Firestore database instance

2. **`src/lib/firestoreQueries.ts`**: Firestore data fetching utilities
   - `fetchSupplierAdvances()`: Fetches all supplier advances from Firestore
   - `fetchPendingSupplierAdvances()`: Fetches active advances with balance > 0
   - `fetchCoffeeLots()`: Fetches coffee lots with optional payment status filter
   - `getSupplierAdvanceBalance()`: Calculates total advance balance for a supplier

### Data Integration

The **Supplier Advances** page demonstrates the dual-database approach:

- Fetches data from **both** Supabase and Firestore in parallel
- Combines results into a unified list
- Marks each record with its source (Supabase or Firestore)
- Displays all data seamlessly in a single interface

### Features

- **Parallel Fetching**: Data from both databases is fetched simultaneously for optimal performance
- **Source Indication**: Each record shows whether it came from Supabase or Firestore
- **Unified Display**: All data appears in a single table with consistent formatting
- **Smart Mapping**: Firestore data is transformed to match the Supabase schema
- **Error Handling**: Graceful fallback if Firestore connection fails

## Data Mapping

### Supplier Advances

Firestore schema → Finance Portal:

```typescript
{
  supplier_id: string          // Firestore document ID
  supplier_name: string        // Mapped to supplier_name
  amount: number               // Total advance amount
  recovered: number            // Amount recovered so far
  balance: number              // Outstanding balance
  date: Timestamp             // Advance date
  status: 'active' | 'cleared' // Mapped to 'Pending' | 'Cleared'
  created_at: Timestamp        // Creation timestamp
  updated_at: Timestamp        // Last update timestamp
}
```

### Benefits

1. **No Data Migration**: Legacy data stays in Firestore
2. **Unified View**: Finance team sees all data in one place
3. **Clear Provenance**: Source badge shows data origin
4. **Easy Maintenance**: Each database managed independently
5. **Scalable**: Can easily add more Firestore collections as needed

## Usage Example

```typescript
import { fetchSupplierAdvances } from '../lib/firestoreQueries'

// Fetch supplier advances from Firestore
const firestoreAdvances = await fetchSupplierAdvances()

// Fetch from Supabase
const { data: supabaseAdvances } = await supabase
  .from('finance_advances')
  .select('*')

// Combine and display
const allAdvances = [...supabaseAdvances, ...firestoreAdvances]
```

## Future Enhancements

- Add Firestore integration for coffee lots and payments
- Implement real-time listeners for live updates
- Add write-back capability for updating Firestore records
- Create migration tools to move data from Firestore to Supabase
- Add analytics to track data source usage

## Security

- Firebase credentials stored in environment variables
- Read-only access prevents accidental data modification
- Row Level Security (RLS) applied to all Supabase data
- Firebase security rules managed in the traceability system

## Dependencies

The following Firebase packages are installed:

```json
{
  "firebase": "^11.x.x"
}
```

## Troubleshooting

### Connection Issues

If Firestore connection fails:

1. Verify Firebase credentials in `.env` file
2. Check Firebase project permissions
3. Ensure Firestore database is accessible
4. Review browser console for detailed error messages

### Missing Data

If Firestore data doesn't appear:

1. Verify collection names match exactly (`supplier_advances`, `coffee_lots`)
2. Check Firestore security rules allow read access
3. Confirm data exists in Firestore using Firebase Console
4. Review network tab for failed requests

### Performance

If data loading is slow:

1. Consider adding indexes to Firestore collections
2. Implement pagination for large datasets
3. Cache frequently accessed data
4. Use Firestore real-time listeners instead of polling

## Support

For Firebase integration issues, contact the IT team or refer to the main traceability system documentation.
