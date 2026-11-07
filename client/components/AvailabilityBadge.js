export default function AvailabilityBadge({ available, total }) {
    let text;
    let style;

    if (total === 0) {
        text = "No copies yet";
        style = "bg-slate-100 text-slate-600";
    } else if (available === 0) {
        text = "All copies out";
        style = "bg-amber-100 text-amber-800";
    } else {
        text = `${available} of ${total} available`;
        style = "bg-green-100 text-green-800";
    }

    return (
        <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${style}`}>
            {text}
        </span>
    )
}