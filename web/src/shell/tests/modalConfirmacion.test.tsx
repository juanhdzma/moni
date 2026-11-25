import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '@/test/render'
import { useModal } from '@/shell/providers/ModalProvider'
import { ConfirmModal } from '@/shell/hooks/acciones/ConfirmModal'

beforeEach(() => localStorage.clear())
afterEach(() => vi.unstubAllGlobals())

describe('modal', () => {
  describe('pila: confirmación encima del form', () => {
    function ConPila() {
      const { openModal, pushModal, popModal, closeModal } = useModal()
      const confirmar = () =>
        pushModal('Confirmar', <ConfirmModal mensaje="¿Seguro?" onCancelar={popModal} onConfirmar={() => closeModal()} />)
      return (
        <button onClick={() => openModal('Form', <><input aria-label="nombre" /><button onClick={confirmar}>pedir</button></>)}>abrir</button>
      )
    }

    const abrirConfirmacion = async () => {
      const user = userEvent.setup()
      renderWithProviders(<ConPila />)
      const abrir = screen.getByText('abrir')
      abrir.focus()
      await user.click(abrir)
      await user.type(screen.getByLabelText('nombre'), 'abc')
      await user.click(screen.getByRole('button', { name: 'pedir' }))
      return { user, abrir }
    }

    it('al abrirla muestra solo la confirmación y enfoca su primer control', async () => {
      await abrirConfirmacion()
      expect(screen.getByText('Confirmar')).toHaveAttribute('id', 'modal-title')
      expect(screen.getByText('¿Seguro?')).toBeVisible()
      expect(screen.getByLabelText('nombre')).not.toBeVisible()
      expect(screen.getByRole('button', { name: 'Cancelar' })).toHaveFocus()
    })

    it('cancelar vuelve al form con lo escrito y devuelve el foco al botón que la abrió', async () => {
      const { user } = await abrirConfirmacion()
      await user.click(screen.getByRole('button', { name: 'Cancelar' }))
      expect(document.getElementById('modal-overlay')).toHaveClass('open')
      expect(screen.getByText('Form')).toHaveAttribute('id', 'modal-title')
      expect(screen.getByLabelText('nombre')).toHaveValue('abc')
      expect(screen.queryByText('¿Seguro?')).toBeNull()
      expect(screen.getByRole('button', { name: 'pedir' })).toHaveFocus()
    })

    it('confirmar cierra todo y devuelve el foco al abridor original', async () => {
      const { user, abrir } = await abrirConfirmacion()
      await user.click(screen.getByRole('button', { name: 'Eliminar' }))
      expect(document.getElementById('modal-overlay')).not.toHaveClass('open')
      expect(abrir).toHaveFocus()
    })

    it('Escape cierra solo el tope y un segundo Escape cierra el form', async () => {
      const { user, abrir } = await abrirConfirmacion()
      await user.keyboard('{Escape}')
      expect(document.getElementById('modal-overlay')).toHaveClass('open')
      expect(screen.getByLabelText('nombre')).toHaveValue('abc')
      await user.keyboard('{Escape}')
      expect(document.getElementById('modal-overlay')).not.toHaveClass('open')
      expect(abrir).toHaveFocus()
    })

    it('Tab no escapa a los controles escondidos del form de abajo', async () => {
      const { user } = await abrirConfirmacion()
      const eliminar = screen.getByRole('button', { name: 'Eliminar' })
      eliminar.focus()
      await user.tab()
      expect(screen.getByLabelText('Cerrar')).toHaveFocus()
    })
  })
})
