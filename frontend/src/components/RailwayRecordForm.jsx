import { useState } from "react";

function RailwayRecordForm({ onRecordCreated }) {
  const [rNo, setRNo] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const createRecord = async (event) => {
    event.preventDefault();

    const value = rNo.trim();

    if (!value) {
      setError("Please enter the R-No.");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        "http://127.0.0.1:8000/api/railway-records",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            r_no: value,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(
          "Unable to create railway record."
        );
      }

      const data = await response.json();

      onRecordCreated(data);
    } catch (err) {
      console.error(
        "Railway record creation error:",
        err
      );

      setError(
        err.message ||
          "Unable to create railway record."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="railway-record-card">
      <div className="railway-record-header">
        <h2>Railway Record</h2>

        <p>
          Enter the R-No before starting wagon
          detection.
        </p>
      </div>

      <form onSubmit={createRecord}>
        <div className="form-group">
          <label htmlFor="r-no">
            R-No
          </label>

          <input
            id="r-no"
            type="text"
            value={rNo}
            onChange={(event) =>
              setRNo(event.target.value)
            }
            placeholder="Enter R-No"
            disabled={loading}
          />
        </div>

        {error && (
          <div className="record-error">
            {error}
          </div>
        )}

        <button
          type="submit"
          className="start-inspection-button"
          disabled={loading}
        >
          {loading
            ? "Creating Record..."
            : "Start Inspection"}
        </button>
      </form>
    </section>
  );
}

export default RailwayRecordForm;