import { Link } from 'react-router'

export const Logo = () => (
  <Link to="/" className="flex items-center gap-2 font-semibold tracking-tight text-stone-900">
    <img src="/favicon.svg" alt="" className="size-7" />
    lostandfound
  </Link>
)
