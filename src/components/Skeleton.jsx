import PropTypes from 'prop-types'

export default function Skeleton({ className }) {
  return <div className={`skeleton rounded-md ${className}`} aria-hidden="true" />
}

Skeleton.propTypes = {
  className: PropTypes.string,
}

Skeleton.defaultProps = {
  className: '',
}
