import { configureStore } from '@reduxjs/toolkit'
import { reducer as fichiers, setup as setupFichiers } from './fichiersSlice'
import { reducer as navigationSecondaire, setup as setupNavigationSecondaire } from './navigationSecondaireSlice'
import uploader, { uploaderMiddlewareSetup } from './uploaderSlice'
import downloader, { downloaderMiddlewareSetup } from './downloaderSlice'
import mediaJobs, { middlewareSetup as middlewareSetupMedia } from './mediaJobsSlice'

function storeSetup(workers) {

  // Configurer le store redux
  const store = configureStore({

    reducer: { 
      fichiers, 
      navigationSecondaire,  // Utilise pour modal de navigation (copier, deplacer)
      uploader, 
      downloader,
      mediaJobs,
    },

    middleware: (getDefaultMiddleware) => {
      
      const { dechiffrageMiddleware } = setupFichiers(workers)
      const { dechiffrageMiddleware: dechiffrageNavigationSecondaire } = setupNavigationSecondaire(workers)
      const uploaderMiddleware = uploaderMiddlewareSetup(workers)
      const downloaderMiddleware = downloaderMiddlewareSetup(workers)
      const mediaJobsMiddleware = middlewareSetupMedia(workers)

      // Prepend, evite le serializability check
      return getDefaultMiddleware()
        .prepend(dechiffrageMiddleware.middleware)
        .prepend(dechiffrageNavigationSecondaire.middleware)
        .prepend(uploaderMiddleware.middleware)
        .prepend(downloaderMiddleware.middleware)
        .prepend(mediaJobsMiddleware.middleware)

    },
  })

  return store
}

export default storeSetup
