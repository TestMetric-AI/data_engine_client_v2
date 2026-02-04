import { render, screen } from '@testing-library/react'
import { Button } from '../Button'

describe('Button', () => {
    it('renders correctly with children', () => {
        render(<Button>Click me</Button>)
        const button = screen.getByRole('button', { name: /click me/i })
        expect(button).toBeInTheDocument()
    });

    it('applies custom className', () => {
        render(<Button className="custom-class">Click me</Button>)
        const button = screen.getByRole('button')
        expect(button).toHaveClass('custom-class')
    });

    it('renders as disabled when disabled prop is passed', () => {
        render(<Button disabled>Click me</Button>)
        const button = screen.getByRole('button')
        expect(button).toBeDisabled()
    });
})
