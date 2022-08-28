import { configureStore } from '@reduxjs/toolkit'
import fichiers, { dechiffrageMiddlewareSetup } from './fichiersSlice'
import uploader, { uploaderMiddlewareSetup } from './uploaderSlice'

function storeSetup(workers) {
  
  // Configurer le store redux
  const store = configureStore({

    reducer: { fichiers, uploader },

    middleware: (getDefaultMiddleware) => {
      
      const dechiffrageMiddleware = dechiffrageMiddlewareSetup(workers)
      const uploaderMiddleware = uploaderMiddlewareSetup(workers)

      // Prepend, evite le serializability check
      return getDefaultMiddleware()
        .prepend(dechiffrageMiddleware.middleware)
        .prepend(uploaderMiddleware.middleware)

    },
  })

  return store
}

export default storeSetup
