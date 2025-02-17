/* eslint-disable react/button-has-type */
import * as React from 'react'
import styled from 'styled-components'

interface ICustomButton {
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void
  className?: string
  type?: 'submit' | 'reset' | 'button'
  disabled?: boolean
  icon?: JSX.Element | null
  label: string
  suppressed?: boolean
  style?: any
  title: string
}

interface IButton {
  suppressed: boolean | undefined
}

const Button = styled.button<IButton>`
  display: inline-block;
  font-weight: 400;
  color: ${({ suppressed }) =>
    suppressed ? `var(--color-grey) ` : `var(--color-black) `};
  text-align: center;
  vertical-align: middle;
  user-select: none;
  background-color: transparent;
  border: 1px solid transparent;
  border-top-color: transparent;
  border-right-color: transparent;
  border-bottom-color: transparent;
  border-left-color: transparent;
  padding: 0.375rem 0.75rem;
  font-size: 13px;
  line-height: 1.5;
  border-radius: 4px;
  transition: color 0.15s ease-in-out, background-color 0.15s ease-in-out,
    border-color 0.15s ease-in-out, box-shadow 0.15s ease-in-out;
  cursor: pointer;
  font-family: var(--font-family);

  &:hover {
    color: var(--color-black);
    border-color: var(--color-grey);
    box-shadow: rgba(0, 0, 0, 0.1) 0px 0px 10px;
  }

  &:disabled {
    cursor: not-allowed;
  }
`

const InnerButton = styled.div`
  display: flex;
  align-items: center;

  .icon {
    margin-right: 13px;
    line-height: 0;
    text-align: center;
    transition: opacity 0.3s ease 0s;
  }
`

const CustomButton = ({
  onClick = undefined,
  className = undefined,
  disabled = false,
  icon = null,
  label,
  type = 'button',
  suppressed = false,
  style = undefined,
  title,
}: ICustomButton) => (
  <Button
    onClick={onClick ? (event) => onClick(event) : undefined}
    className={className}
    type={type ?? 'button'}
    disabled={disabled}
    suppressed={suppressed}
    style={style}
    title={title}
  >
    <InnerButton>
      {icon && <div className="icon">{icon}</div>}
      <span>{label}</span>
    </InnerButton>
  </Button>
)
export default CustomButton
