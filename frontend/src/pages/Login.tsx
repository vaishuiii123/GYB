<div
  style={{
    marginBottom: "25px",
  }}
>
  <label
    style={{
      display: "block",
      marginBottom: "10px",
      fontWeight: "600",
      color: "#374151",
      fontSize: "15px",
    }}
  >
    Email Address
  </label>

  <div
    style={{
      position: "relative",
    }}
  >
    <input
      type="email"
      placeholder="admin@test.com"
      value={email}
      onChange={(e) =>
        setEmail(e.target.value)
      }
      style={{
        width: "100%",
        padding: "16px 18px",
        borderRadius: "14px",
        border: "1px solid #d1d5db",
        fontSize: "16px",
        outline: "none",
        boxSizing: "border-box",
        background: "#f9fafb",
        transition: "0.3s",
      }}
    />
  </div>
</div>
