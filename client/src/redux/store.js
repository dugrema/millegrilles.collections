import { configureStore } from '@reduxjs/toolkit'
import fichiers, { dechiffrageMiddlewareSetup } from './fichiersSlice'

function storeSetup(workers) {
  
  // Configurer le store redux
  const store = configureStore({
    reducer: { fichiers },
    middleware: (getDefaultMiddleware) => {
      // Prepend, evite le serializability check
      const dechiffrageMiddleware = dechiffrageMiddlewareSetup(workers)
      return getDefaultMiddleware().prepend(dechiffrageMiddleware.middleware)
    },
  })

  return store
}

export default storeSetup
