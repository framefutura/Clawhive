import type { ClawHiveAPI } from './index'

declare global {
  interface Window {
    clawhive: ClawHiveAPI
  }
}
