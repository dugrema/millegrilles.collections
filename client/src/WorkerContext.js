import React, { createContext, useContext } from 'react'

const Context = createContext()

function useWorkers() {
    return useContext(Context)
}

export default useWorkers

export function WorkerProvider(props) {
    return <Context.Provider value={props.workers}>{props.children}</Context.Provider>
}

export function WorkerContext(props) {
    return <Context.Consumer>{props.children}</Context.Consumer>
}
