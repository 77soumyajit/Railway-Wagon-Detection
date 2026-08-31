import { useState } from "react";

function ScannedWagons({
  wagons,
  onDelete,
  onMoveUp,
  onMoveDown,
  onReorder,
  onUpdate,
  onSave,
  saving,
}) {
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({});
  const [draggedId, setDraggedId] = useState(null);
  const [dragOverId, setDragOverId] = useState(null);

  const startEdit = (wagon) => {
    setEditingId(wagon.local_id);

    setEditData({
      wagon_no: wagon.wagon_no || "",
      wagon_type: wagon.wagon_type || "",
      wagon_owning: wagon.wagon_owning || "",
      gross: wagon.gross || "",
      tare: wagon.tare || "",
      load: wagon.load || "",
      other: wagon.other || "",
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditData({});
  };

  const updateField = (field, value) => {
    setEditData((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const saveEdit = () => {
    const wagonNumber = editData.wagon_no.trim();

    if (!wagonNumber) {
      return;
    }

    if (!/^\d{11}$/.test(wagonNumber)) {
      return;
    }

    onUpdate(editingId, {
      ...editData,
      wagon_no: wagonNumber,
    });

    setEditingId(null);
    setEditData({});
  };

  const handleDragStart = (event, localId) => {
    if (editingId || saving) {
      event.preventDefault();
      return;
    }

    setDraggedId(localId);
    setDragOverId(null);

    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", localId);
  };

  const handleDragOver = (event, localId) => {
    event.preventDefault();

    if (!draggedId || draggedId === localId) {
      return;
    }

    event.dataTransfer.dropEffect = "move";
    setDragOverId(localId);
  };

  const handleDrop = (event, targetId) => {
    event.preventDefault();

    const sourceId =
      event.dataTransfer.getData("text/plain") ||
      draggedId;

    if (
      !sourceId ||
      sourceId === targetId ||
      !onReorder
    ) {
      setDraggedId(null);
      setDragOverId(null);
      return;
    }

    const sourceIndex = wagons.findIndex(
      (wagon) => wagon.local_id === sourceId
    );

    const targetIndex = wagons.findIndex(
      (wagon) => wagon.local_id === targetId
    );

    if (sourceIndex === -1 || targetIndex === -1) {
      setDraggedId(null);
      setDragOverId(null);
      return;
    }

    const reordered = [...wagons];

    const [movedWagon] = reordered.splice(
      sourceIndex,
      1
    );

    reordered.splice(targetIndex, 0, movedWagon);

    onReorder(reordered);

    setDraggedId(null);
    setDragOverId(null);
  };

  const handleDragEnd = () => {
    setDraggedId(null);
    setDragOverId(null);
  };

  const formatDetectedAt = (value) => {
    if (!value) {
      return "--";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "--";
    }

    return date.toLocaleString("en-IN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  if (!wagons.length) {
    return (
      <section className="scanned-wagons-card">
        <div className="scanned-wagons-header">
          <div>
            <span className="section-eyebrow">
              INSPECTION QUEUE
            </span>

            <div className="scanned-title-row">
              <h2>Scanned Wagons</h2>

              <span className="wagon-count">0</span>
            </div>

            <p>
              Verified wagons will appear here before
              saving.
            </p>
          </div>
        </div>

        <div className="scanned-wagons-empty">
          <div className="scanned-wagons-empty-icon">
            +
          </div>

          <h3>No wagons scanned yet</h3>

          <p>
            Start the camera and scan a wagon to add
            it to this inspection.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="scanned-wagons-card">
      <div className="scanned-wagons-header">
        <div>
          <span className="section-eyebrow">
            INSPECTION QUEUE
          </span>

          <div className="scanned-title-row">
            <h2>Scanned Wagons</h2>

            <span className="wagon-count">
              {wagons.length}
            </span>
          </div>

          <p>
            Drag any wagon row to change its sequence.
          </p>
        </div>
      </div>

      <div className="wagon-table-wrapper">
        <div className="wagon-table-head">
          <div>SL</div>
          <div>WAGON NUMBER</div>
          <div>WAGON TYPE</div>
          <div>OWNER</div>
          <div>DETECTED</div>
          <div>ORDER</div>
          <div>ACTION</div>
        </div>

        <div className="wagon-table-body">
          {wagons.map((wagon, index) => {
            const isEditing =
              editingId === wagon.local_id;

            const isDragging =
              draggedId === wagon.local_id;

            const isDragOver =
              dragOverId === wagon.local_id;

            if (isEditing) {
              return (
                <div
                  key={wagon.local_id}
                  className="wagon-edit-card"
                >
                  <div className="wagon-edit-header">
                    <div>
                      <span>EDIT WAGON</span>

                      <strong>
                        Wagon #{index + 1}
                      </strong>
                    </div>

                    <button
                      type="button"
                      className="wagon-edit-close"
                      onClick={cancelEdit}
                    >
                      ×
                    </button>
                  </div>

                  <div className="wagon-edit-grid">
                    <label>
                      Wagon Number
                      <input
                        value={editData.wagon_no}
                        maxLength={11}
                        inputMode="numeric"
                        onChange={(event) =>
                          updateField(
                            "wagon_no",
                            event.target.value.replace(
                              /\D/g,
                              ""
                            )
                          )
                        }
                      />
                    </label>

                    <label>
                      Wagon Type
                      <input
                        value={editData.wagon_type}
                        onChange={(event) =>
                          updateField(
                            "wagon_type",
                            event.target.value
                          )
                        }
                      />
                    </label>

                    <label>
                      Owner
                      <input
                        value={editData.wagon_owning}
                        onChange={(event) =>
                          updateField(
                            "wagon_owning",
                            event.target.value
                          )
                        }
                      />
                    </label>

                    <label>
                      Gross
                      <input
                        value={editData.gross}
                        onChange={(event) =>
                          updateField(
                            "gross",
                            event.target.value
                          )
                        }
                      />
                    </label>

                    <label>
                      Tare
                      <input
                        value={editData.tare}
                        onChange={(event) =>
                          updateField(
                            "tare",
                            event.target.value
                          )
                        }
                      />
                    </label>

                    <label>
                      Load
                      <input
                        value={editData.load}
                        onChange={(event) =>
                          updateField(
                            "load",
                            event.target.value
                          )
                        }
                      />
                    </label>

                    <label>
                      Other
                      <input
                        value={editData.other}
                        onChange={(event) =>
                          updateField(
                            "other",
                            event.target.value
                          )
                        }
                      />
                    </label>
                  </div>

                  <div className="wagon-edit-actions">
                    <button
                      type="button"
                      className="wagon-action-save"
                      onClick={saveEdit}
                      disabled={
                        !/^\d{11}$/.test(
                          editData.wagon_no.trim()
                        )
                      }
                    >
                      Save Changes
                    </button>

                    <button
                      type="button"
                      className="wagon-action-cancel"
                      onClick={cancelEdit}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              );
            }

            return (
              <div
                key={wagon.local_id}
                className={`wagon-row ${
                  isDragging
                    ? "wagon-row-dragging"
                    : ""
                } ${
                  isDragOver
                    ? "wagon-row-drag-over"
                    : ""
                }`}
                draggable={!saving}
                onDragStart={(event) =>
                  handleDragStart(
                    event,
                    wagon.local_id
                  )
                }
                onDragOver={(event) =>
                  handleDragOver(
                    event,
                    wagon.local_id
                  )
                }
                onDrop={(event) =>
                  handleDrop(
                    event,
                    wagon.local_id
                  )
                }
                onDragEnd={handleDragEnd}
              >
                <div className="wagon-sl">
                  <span className="drag-handle">
                    ⠿
                  </span>

                  <span className="wagon-sl-number">
                    {index + 1}
                  </span>
                </div>

                <div className="wagon-number-cell">
                  {wagon.wagon_no}
                </div>

                <div>
                  <span className="wagon-type-badge">
                    {wagon.wagon_type || "--"}
                  </span>
                </div>

                <div className="wagon-owner">
                  {wagon.wagon_owning || "--"}
                </div>

                <div className="wagon-detected">
                  {formatDetectedAt(
                    wagon.detected_at
                  )}
                </div>

                <div className="wagon-order-buttons">
                  <button
                    type="button"
                    onClick={() =>
                      onMoveUp(index)
                    }
                    disabled={
                      index === 0 || saving
                    }
                    title="Move wagon up"
                  >
                    ↑
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      onMoveDown(index)
                    }
                    disabled={
                      index ===
                        wagons.length - 1 ||
                      saving
                    }
                    title="Move wagon down"
                  >
                    ↓
                  </button>
                </div>

                <div className="wagon-actions">
                  <button
                    type="button"
                    className="wagon-edit-button"
                    onClick={() =>
                      startEdit(wagon)
                    }
                    disabled={saving}
                  >
                    Edit
                  </button>

                  <button
                    type="button"
                    className="wagon-delete-button"
                    onClick={() =>
                      onDelete(
                        wagon.local_id
                      )
                    }
                    disabled={saving}
                  >
                    Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="scanned-wagons-footer">
        <div className="draft-status">
        </div>

        <button
          type="button"
          className="save-wagons-button footer-save-button"
          onClick={onSave}
          disabled={
            saving || !wagons.length
          }
        >
          {saving
            ? "Saving..."
            : `Save ${wagons.length} Wagons`}
        </button>
      </div>
    </section>
  );
}

export default ScannedWagons;