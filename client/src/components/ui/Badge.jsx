const variants = {
  default: 'bg-gray-700 text-gray-300',
  primary: 'bg-blue-500/20 text-blue-400 border border-blue-500/30',
  success: 'bg-green-500/20 text-green-400 border border-green-500/30',
  warning: 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30',
  danger: 'bg-red-500/20 text-red-400 border border-red-500/30',
  purple: 'bg-purple-500/20 text-purple-400 border border-purple-500/30',
  easy: 'bg-green-500/20 text-green-400 border border-green-500/30',
  medium: 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30',
  hard: 'bg-red-500/20 text-red-400 border border-red-500/30'
};

const sizes = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-1 text-xs',
  lg: 'px-3 py-1.5 text-sm'
};

function Badge({
  children,
  variant = 'default',
  size = 'md',
  className = '',
  icon: Icon,
  ...props
}) {
  return (
    <span
      className={`
        inline-flex items-center gap-1
        font-medium rounded-full
        ${variants[variant]}
        ${sizes[size]}
        ${className}
      `}
      {...props}
    >
      {Icon && <Icon className="w-3 h-3" />}
      {children}
    </span>
  );
}

export function DifficultyBadge({ difficulty }) {
  const difficultyVariant = difficulty?.toLowerCase() || 'medium';
  return (
    <Badge variant={difficultyVariant}>
      {difficulty || 'Medium'}
    </Badge>
  );
}

export function CategoryBadge({ category }) {
  return (
    <Badge variant="purple">
      {category}
    </Badge>
  );
}

export default Badge;
