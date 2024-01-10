import { expose } from 'comlink'
import * as FiletransferDownloadClient from '../transferts/filetransferDownloadClient'
//import * as FiletransferUploadClient from '../transferts/filetransferUploadClient'
expose({
    ...FiletransferDownloadClient,
    //...FiletransferUploadClient
})