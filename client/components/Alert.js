export default function Alert({ children, type = "error" }) {
    const styles =
        type === "error"
            ? "border-red-200 bg-red-50 text-red-800"
            : "border-green-200 bg-green-50 text-green-800";
    return (
        <div role="alert" className={`rounded-lg border px-3 py-2 text-sm ${styles}`}>
            {children}
        </div>
    )
}