/** Telefonnummer statt E-Mail? Dann gibt es keine Benachrichtigungen – darauf weisen wir hin. */
const isPhoneContact = (value: string) => /^[+\d][\d\s/-]{6,}$/.test(value.trim())

export const ContactHint = ({ value }: { value: string }) =>
  isPhoneContact(value) ? (
    <span className="font-medium text-accent-700">
      Mit einer Telefonnummer erhalten Sie keine E-Mail-Benachrichtigung. Geben Sie besser eine E-Mail-Adresse an – oder speichern Sie nach dem
      Senden den Statuslink.
    </span>
  ) : (
    'E-Mail-Adresse empfohlen – dorthin senden wir Bestätigung und Neuigkeiten. Telefonnummer ist auch möglich.'
  )
