import ConfirmDialog from "../common/ConfirmDialog";

function Count({ label, value, tone }) {
  return (
    <div className="flex-1 rounded-xl border border-border bg-background px-3 py-2.5 text-center">
      <div className="text-xl font-semibold tabular-nums" style={{ color: tone }}>
        {value}
      </div>
      <div className="text-xs text-text-secondary">{label}</div>
    </div>
  );
}

/** Import preview: counts of new / updated / skipped words; nothing is written until confirmed. */
export default function ImportDialog({ plan, fileName, onConfirm, onCancel }) {
  const changes = plan ? plan.toAdd.length + plan.toUpdate.length : 0;

  return (
    <ConfirmDialog
      open={Boolean(plan)}
      title="Import vocabulary?"
      message={fileName ? `From ${fileName}` : undefined}
      confirmLabel={changes ? `Import ${changes} word${changes === 1 ? "" : "s"}` : "Nothing to import"}
      onConfirm={onConfirm}
      onCancel={onCancel}
    >
      {plan && (
        <>
          <div className="flex gap-2">
            <Count label="New" value={plan.toAdd.length} tone="var(--color-success)" />
            <Count label="Updated" value={plan.toUpdate.length} tone="var(--color-text-primary)" />
            <Count label="Skipped" value={plan.skipped} tone="var(--color-text-secondary)" />
          </div>
          <p className="m-0 mt-3 text-xs leading-relaxed text-text-secondary">
            Updated words are ones where the backup has a newer version. Skipped words already exist with the same or
            newer changes, appear twice in the file, or are invalid. Practice history isn’t affected.
          </p>
        </>
      )}
    </ConfirmDialog>
  );
}
