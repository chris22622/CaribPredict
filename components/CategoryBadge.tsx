interface CategoryBadgeProps {
  category: string;
  size?: 'sm' | 'md';
}

export default function CategoryBadge({ category, size = 'sm' }: CategoryBadgeProps) {
  const getCategoryColor = (cat: string) => {
    const normalizedCat = cat.toLowerCase();
    if (normalizedCat.includes('politic')) return 'bg-purple-100 text-purple-700';
    if (normalizedCat.includes('sport')) return 'bg-green-100 text-green-700';
    if (normalizedCat.includes('entertainment')) return 'bg-pink-100 text-pink-700';
    if (normalizedCat.includes('crypto')) return 'bg-orange-100 text-orange-700';
    if (normalizedCat.includes('weather')) return 'bg-blue-100 text-blue-700';
    if (normalizedCat.includes('business')) return 'bg-indigo-100 text-indigo-700';
    return 'bg-caribbean-gray-100 text-caribbean-gray-700';
  };

  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm';

  return (
    <span
      className={`inline-block rounded-full font-medium ${getCategoryColor(
        category
      )} ${sizeClasses}`}
    >
      {category}
    </span>
  );
}
