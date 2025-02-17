import { useEffect, useMemo } from 'react'
import { AnimatePresence } from 'framer-motion'
import { push } from 'redux-first-history'
import { HistoryRouter } from 'redux-first-history/rr6'
import {
  checkBase,
  recheckBase,
  selectBaseLoaded,
  selectIsAuthenticated,
  setIsAuthenticated,
} from './store/baseSlice'
import RoutesConstants from './constants/routes.json'
import * as GS from './styles/globalStyles'
import { useAppDispatch, useAppSelector } from './store/hooks'
import { selectStorageLabels } from './store/labelsSlice'
import { BASE_ARRAY } from './constants/baseConstants'
import { history } from './store/store'
import { fetchToken } from './data/api'
import { selectServiceUnavailable } from './store/utilsSlice'
import SnackbarNotification from './components/Elements/SnackbarNotification/SnackbarNotification'
import RoutesComponent from './Routes'
import AppHeaderHelp from './AppHeaderHelp'

const App = () => {
  const dispatch = useAppDispatch()
  const baseLoaded = useAppSelector(selectBaseLoaded)
  const storageLabels = useAppSelector(selectStorageLabels)
  const isAuthenticated = useAppSelector(selectIsAuthenticated)
  const serviceUnavailable = useAppSelector(selectServiceUnavailable)

  useEffect(() => {
    if (!baseLoaded && isAuthenticated) {
      dispatch(checkBase())
    }
  }, [baseLoaded, isAuthenticated])

  useEffect(() => {
    const token = fetchToken()
    if (token) {
      dispatch(setIsAuthenticated(true))
      dispatch(push(RoutesConstants.HOME))
    }
  }, [])

  useEffect(() => {
    if (!baseLoaded && storageLabels.length === BASE_ARRAY.length) {
      dispatch(recheckBase())
    }
  }, [baseLoaded, storageLabels])

  const memoizedHeaderHelp = useMemo(() => <AppHeaderHelp />, [])

  const memoizedRoutesComponent = useMemo(
    () => (
      <AnimatePresence exitBeforeEnter>
        <RoutesComponent />
      </AnimatePresence>
    ),
    []
  )

  return (
    <HistoryRouter history={history}>
      <GS.Base>
        {baseLoaded && memoizedHeaderHelp}
        {memoizedRoutesComponent}
        {serviceUnavailable && (
          <SnackbarNotification text={serviceUnavailable} />
        )}
      </GS.Base>
    </HistoryRouter>
  )
}

export default App
