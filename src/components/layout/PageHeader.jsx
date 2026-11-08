/** Consistent page title row used by Library, Vocabulary and Practice. */
export default function PageHeader({ title, subtitle, action }) {
  return (
    <header className="mb-6 flex items-end justify-between gap-4 md:mb-8">
      <div className="min-w-0">
        <h1 className="m-0 text-[26px] font-bold tracking-tight text-text-primary md:text-[28px]">{title}</h1>
        {subtitle && <p className="m-0 mt-1 text-sm text-text-secondary">{subtitle}</p>}
      </div>
      {action && <div className="flex shrink-0 items-center gap-2">{action}</div>}
    </header>
  );
}
