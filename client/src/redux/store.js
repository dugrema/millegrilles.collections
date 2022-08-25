import { configureStore } from '@reduxjs/toolkit'
import fichiers from './fichiersSlice'

function storeSetup(workers) {
  
  // Configurer le store redux
  const store = configureStore({
    reducer: { fichiers }
  })

  return store
}

export default storeSetup
