export default function FormField({
    label,
    name,
    type = "text",
    value,
    onChange,
    error,
    autoComplete,
    placeholder,
}) {
    return (
        <div>
            <label htmlFor={name} className="mb-1 block text-sm font-medium text-slate-700">
                {label}
            </label>
            <input
                id={name}
                name={name}
                type={type}
                value={value}
                onChange={onChange}
                autoComplete={autoComplete}
                placeholder={placeholder}
                aria-invalid={error ? "true" : "false"}
                className={`w-full rounded-lg border bg-white px-3 py-2 text-base outline-none focus:ring-2 focus:ring-indigo-500 ${error ? "border-red-500" : "border-slate-300"}`}
            />
            {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
        </div>
    )
}