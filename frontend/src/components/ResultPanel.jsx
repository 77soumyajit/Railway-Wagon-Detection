function ResultPanel({
  detectionResult,
  onClose,
  onScanAgain,
}) {
  if (!detectionResult) {
    return (
      <section className="result-card">
        <div className="result-header">
          <div>
            <h2>Detection Result</h2>
            <p>
              YOLO + OCR + Wagon Number Validation
            </p>
          </div>
        </div>

        <div className="result-placeholder">
          <div className="result-placeholder-icon">
            🔍
          </div>

          <h3>
            Waiting for wagon detection
          </h3>

          <p>
            Start the camera and position the
            wagon number inside the detection
            area.
          </p>
        </div>
      </section>
    );
  }

  const verified =
    detectionResult.verified === true;

  const wagonNumber =
    detectionResult.ocr?.wagon_number;

  const metadata =
    detectionResult.metadata;

  const validation =
    detectionResult.validation;

  const ocrConfidence =
    Number(
      detectionResult.ocr?.confidence || 0
    ) * 100;

  const checkDigit =
    validation?.check_digit;

  return (
    <section className="result-card">

      <div className="result-header">
        <div>
          <h2>Detection Result</h2>

          <p>
            YOLO + OCR + Wagon Number Validation
          </p>
        </div>

        <button
          className="result-close-button"
          onClick={onClose}
          aria-label="Close result"
        >
          ×
        </button>
      </div>

      <div
        className={`verification-card ${
          verified
            ? "verification-success"
            : "verification-failed"
        }`}
      >

        <div className="verification-icon">
          {verified ? "✓" : "×"}
        </div>

        <div>
          <h3>
            {verified
              ? "Wagon Verified"
              : "Verification Failed"}
          </h3>

          <p>
            {verified
              ? "Check digit verification successful"
              : "Wagon number could not be verified"}
          </p>
        </div>

      </div>

      {wagonNumber && (
        <div className="wagon-number-card">

          <span className="wagon-number-label">
            WAGON NUMBER
          </span>

          <strong>
            {wagonNumber}
          </strong>

          <span className="ocr-confidence">
            OCR Confidence:{" "}
            {ocrConfidence.toFixed(1)}%
          </span>

        </div>
      )}

      {verified && metadata && (
        <div className="wagon-breakdown">

          <div className="breakdown-title">
            Wagon Details
          </div>

          <div className="breakdown-grid">

            <div className="breakdown-item">

              <span className="breakdown-code">
                {metadata.wagon_type.code}
              </span>

              <div className="breakdown-content">
                <span className="breakdown-label">
                  Wagon Type
                </span>

                <strong>
                  {metadata.wagon_type.name}
                </strong>
              </div>

            </div>

            <div className="breakdown-item">

              <span className="breakdown-code">
                {metadata.owner.code}
              </span>

              <div className="breakdown-content">
                <span className="breakdown-label">
                  Owner
                </span>

                <strong>
                  {metadata.owner.name}
                </strong>

                <small>
                  {metadata.owner.short_code}
                </small>
              </div>

            </div>

            <div className="breakdown-item">

              <span className="breakdown-code">
                {metadata.manufacturing_year.code}
              </span>

              <div className="breakdown-content">
                <span className="breakdown-label">
                  Manufacturing Year
                </span>

                <strong>
                  {metadata.manufacturing_year.year}
                </strong>
              </div>

            </div>

            <div className="breakdown-item">

              <span className="breakdown-code">
                {metadata.individual_number}
              </span>

              <div className="breakdown-content">
                <span className="breakdown-label">
                  Wagon Number
                </span>

                <strong>
                  Individual Wagon Number
                </strong>
              </div>

            </div>

            <div className="breakdown-item check-digit-item">

              <span className="breakdown-code">
                {metadata.check_digit}
              </span>

              <div className="breakdown-content">
                <span className="breakdown-label">
                  Check Digit
                </span>

                <strong>
                  Verified ✓
                </strong>
              </div>

            </div>

          </div>

        </div>
      )}

      {validation?.check_digit && (
        <div className="check-digit-summary">

          <div>
            <span>
              Actual Check Digit
            </span>

            <strong>
              {checkDigit.actual}
            </strong>
          </div>

          <div>
            <span>
              Calculated Check Digit
            </span>

            <strong>
              {checkDigit.calculated}
            </strong>
          </div>

        </div>
      )}

      <button
        className="scan-again-button"
        onClick={onScanAgain}
      >
        Scan Another Wagon
      </button>

    </section>
  );
}

export default ResultPanel;