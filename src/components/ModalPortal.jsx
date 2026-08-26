import { createPortal } from 'react-dom'

export function ModalPortal({ children, target }) {
  return target ? createPortal(children, target) : children
}
