import { useEffect, useState } from "react";

function WagonList({
  wagons,
  onWagonsChange,
  onSave,
  saving,
}) {
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({
    wagon_no: "",
    wagon_type: "",
    wagon_owning: "",
    gross: "",
    tare: "",
    load: "",
    other: "",
  });

  const [message, setMessage] = useState("");

  useEffect(() => {
    localStorage.setItem(
      "wagon_detection_queue",
      JSON.stringify(wagons)
    );
  }, [wagons]);

  const deleteWagon = (id) => {
    const confirmed = window.confirm(
      "Remove this wagon from the scan list?"
    );

    if (!confirmed) {
      return;
    }

    onWagonsChange(
      wagons.filter(
        (wagon) => wagon.localId !== id
      )
    );
  };

  const moveUp = (index) => {
    if (index === 0) {
      return;
    }

    const updated = [...wagons];

    [
      updated[index - 1],
      updated[index],
    ] = [
      updated[index],
      updated[index - 1],
    ];

    onWagonsChange(updated);
  };

  const moveDown = (index) => {
    if (index === wagons.length - 1) {
      return;
    }

    const updated = [...wagons];

    [
      updated[index],
      updated[index + 1],
    ] = [
      updated[index + 1],
      updated[index],
    ];

    onWagonsChange(updated);
  };

  const startEdit = (wagon) => {
    setEditingId(wagon.localId);

    setEditForm({
      wagon_no: wagon.wagon_no || "",
      wagon_type: wagon.wagon_type || "",
      wagon_owning:
        wagon.wagon_owning || "",
      gross: wagon.gross || "",
      tare: wagon.tare || "",
      load: wagon.load || "",
      other: wagon.other || "",
    });

    setMessage("");
  };

  const cancelEdit = () => {
    setEditingId(null);

    setEditForm({
      wagon_no: "",
      wagon_type: "",
      wagon_owning: "",
      gross: "",
      tare: "",
      load: "",
      other: "",
    });
  };

  const saveEdit = (event) => {
    event.preventDefault();

    const wagonNumber =
      editForm.wagon_no.trim();

    if (!wagonNumber) {
      setMessage(
        "Wagon number is required."
      );
      return;
    }

    const updated = wagons.map(
      (wagon) => {
        if (
          wagon.localId !== editingId
        ) {
          return wagon;
        }

        return {
          ...wagon,
          wagon_no: wagonNumber,
          wagon_type:
            editForm.wagon_type.trim(),
          wagon_owning:
            editForm.wagon_owning.trim(),
          gross: editForm.gross.trim(),
          tare: editForm.tare.trim(),
          load: editForm.load.trim(),
          other: editForm.other.trim(),
        };
      }
    );

    onWagonsChange(updated);

    cancelEdit();
  };

  const getWagonType = (wagon) => {
    if (!wagon.wagon_type) {
      return "--";
    }

    return wagon.wagon_type;
  };

  const getOwner = (wagon) => {
    if (!wagon.wagon_owning) {
      return "--";
    }

    return wagon.wagon_owning;
  };

  if (!wagons.length) {
    return (
      <section className="wagon-list-card">
        <div className="wagon-list-header">
          <div>
            <h2>Scanned Wagons</h2>
            <p>
              Verified wagons will appear here
              before they are saved.
            </p>
          </div>

          <span className="wagon-count">
            0 Wagons
          </span>
        </div>

        <div className="wagon-list-empty">
          <div className="wagon-list-empty-icon">
            🚆
          </div>

          <h3>No wagons scanned yet</h3>

          <p>
            Successfully verified wagons will
            automatically appear in this list.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="wagon-list-card">
      <div className="wagon-list-header">
        <div>
          <h2>Scanned Wagons</h2>

          <p>
            Review and arrange wagons before
            saving them to the railway record.
          </p>
        </div>

        <span className="wagon-count">
          {wagons.length}{" "}
          {wagons.length === 1
            ? "Wagon"
            : "Wagons"}
        </span>
      </div>

      {message && (
        <div className="wagon-list-message">
          {message}
        </div>
      )}

      <div className="wagon-table-wrapper">
        <table className="wagon-table">
          <thead>
            <tr>
              <th>SL NO</th>
              <th>WAGON NO</th>
              <th>WAGON TYPE</th>
              <th>OWNER</th>
              <th>GROSS</th>
              <th>TARE</th>
              <th>LOAD</th>
              <th>OTHER</th>
              <th>ACTIONS</th>
            </tr>
          </thead>

          <tbody>
            {wagons.map(
              (wagon, index) => {
                const isEditing =
                  editingId ===
                  wagon.localId;

                if (isEditing) {
                  return (
                    <tr
                      key={
                        wagon.localId
                      }
                      className="wagon-edit-row"
                    >
                      <td>
                        <strong>
                          {index + 1}
                        </strong>
                      </td>

                      <td>
                        <input
                          className="wagon-edit-input"
                          value={
                            editForm.wagon_no
                          }
                          onChange={(event) =>
                            setEditForm({
                              ...editForm,
                              wagon_no:
                                event.target
                                  .value,
                            })
                          }
                        />
                      </td>

                      <td>
                        <input
                          className="wagon-edit-input"
                          value={
                            editForm.wagon_type
                          }
                          onChange={(event) =>
                            setEditForm({
                              ...editForm,
                              wagon_type:
                                event.target
                                  .value,
                            })
                          }
                        />
                      </td>

                      <td>
                        <input
                          className="wagon-edit-input"
                          value={
                            editForm.wagon_owning
                          }
                          onChange={(event) =>
                            setEditForm({
                              ...editForm,
                              wagon_owning:
                                event.target
                                  .value,
                            })
                          }
                        />
                      </td>

                      <td>
                        <input
                          className="wagon-edit-input"
                          value={
                            editForm.gross
                          }
                          onChange={(event) =>
                            setEditForm({
                              ...editForm,
                              gross:
                                event.target
                                  .value,
                            })
                          }
                        />
                      </td>

                      <td>
                        <input
                          className="wagon-edit-input"
                          value={
                            editForm.tare
                          }
                          onChange={(event) =>
                            setEditForm({
                              ...editForm,
                              tare:
                                event.target
                                  .value,
                            })
                          }
                        />
                      </td>

                      <td>
                        <input
                          className="wagon-edit-input"
                          value={
                            editForm.load
                          }
                          onChange={(event) =>
                            setEditForm({
                              ...editForm,
                              load:
                                event.target
                                  .value,
                            })
                          }
                        />
                      </td>

                      <td>
                        <input
                          className="wagon-edit-input"
                          value={
                            editForm.other
                          }
                          onChange={(event) =>
                            setEditForm({
                              ...editForm,
                              other:
                                event.target
                                  .value,
                            })
                          }
                        />
                      </td>

                      <td>
                        <div className="wagon-edit-actions">
                          <button
                            type="button"
                            className="wagon-action-save"
                            onClick={
                              saveEdit
                            }
                          >
                            Save
                          </button>

                          <button
                            type="button"
                            className="wagon-action-cancel"
                            onClick={
                              cancelEdit
                            }
                          >
                            Cancel
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                }

                return (
                  <tr
                    key={
                      wagon.localId
                    }
                  >
                    <td>
                      <span className="wagon-sl-number">
                        {index + 1}
                      </span>
                    </td>

                    <td>
                      <strong className="wagon-number-cell">
                        {
                          wagon.wagon_no
                        }
                      </strong>
                    </td>

                    <td>
                      {getWagonType(
                        wagon
                      )}
                    </td>

                    <td>
                      {getOwner(
                        wagon
                      )}
                    </td>

                    <td>
                      {wagon.gross ||
                        "--"}
                    </td>

                    <td>
                      {wagon.tare ||
                        "--"}
                    </td>

                    <td>
                      {wagon.load ||
                        "--"}
                    </td>

                    <td>
                      {wagon.other ||
                        "--"}
                    </td>

                    <td>
                      <div className="wagon-actions">
                        <button
                          type="button"
                          className="wagon-action-button wagon-move-button"
                          onClick={() =>
                            moveUp(index)
                          }
                          disabled={
                            index ===
                            0
                          }
                          title="Move up"
                        >
                          ↑
                        </button>

                        <button
                          type="button"
                          className="wagon-action-button wagon-move-button"
                          onClick={() =>
                            moveDown(
                              index
                            )
                          }
                          disabled={
                            index ===
                            wagons.length -
                              1
                          }
                          title="Move down"
                        >
                          ↓
                        </button>

                        <button
                          type="button"
                          className="wagon-action-button wagon-edit-button"
                          onClick={() =>
                            startEdit(
                              wagon
                            )
                          }
                          title="Edit wagon"
                        >
                          Edit
                        </button>

                        <button
                          type="button"
                          className="wagon-action-button wagon-delete-button"
                          onClick={() =>
                            deleteWagon(
                              wagon.localId
                            )
                          }
                          title="Delete wagon"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              }
            )}
          </tbody>
        </table>
      </div>

      <div className="wagon-list-footer">
        <div className="wagon-save-info">
          <span className="save-status-dot"></span>

          <span>
            {wagons.length} wagon
            {wagons.length === 1
              ? ""
              : "s"} ready to save
          </span>
        </div>

        <button
          type="button"
          className="save-wagons-button"
          onClick={onSave}
          disabled={saving}
        >
          {saving
            ? "Saving Wagons..."
            : "Save Wagons"}
        </button>
      </div>
    </section>
  );
}

export default WagonList;