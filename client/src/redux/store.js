import { configureStore } from '@reduxjs/toolkit'
// import fichiers, { dechiffrageMiddlewareSetup } from './fichiersSlice'
import { reducer as fichiers, setup as setupFichiers } from './fichiersSlice'
import uploader, { uploaderMiddlewareSetup } from './uploaderSlice'

function storeSetup(workers) {

  // Configurer le store redux
  const store = configureStore({

    reducer: { 
      fichiers, 
      navigationSecondaire: fichiers ,  // Utilise pour modal de navigation (copier, deplacer)
      uploader, 
    },

    middleware: (getDefaultMiddleware) => {
      
      const { dechiffrageMiddleware } = setupFichiers(workers)
      // const dechiffrageMiddleware = dechiffrageMiddlewareSetup(workers)
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
