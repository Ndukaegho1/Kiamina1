import kiaminaAccountingLogo from '../../assets/kiamina-accounting-logo.svg'

function KiaminaLogo({ className = 'h-10 w-auto', alt = 'Kiamina Accounting Services logo' }) {
  return (
    <img
      src={kiaminaAccountingLogo}
      alt={alt}
      className={className}
    />
  )
}

export default KiaminaLogo
