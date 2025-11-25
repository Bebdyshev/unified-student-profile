'use client';
import { FC } from "react";
import Link from 'next/link';

interface DangerousClass {
  grade: string;
  avg_danger_level: number;
}

interface ClassTableProps {
  dangerousClasses: DangerousClass[];
  gradeIdMap: Map<string, number>;
}

const TableContainer: FC<ClassTableProps> = ({ dangerousClasses, gradeIdMap }) => {
  return (
    <div className="h-full flex flex-col">
      <div className="text-lg font-semibold mb-3 mt-3 text-center">
        Классы по уровню опасности
      </div>

      <div className="overflow-y-auto flex-1">
        <table className="w-full table-auto border-collapse">
          <thead className="bg-white">
            <tr>
              <th className="px-4 py-2 border">No</th>
              <th className="px-4 py-2 border">Класс</th>
              <th className="px-4 py-2 border">Средний уровень опасности</th>
            </tr>
          </thead>
          <tbody>
            {dangerousClasses.map((item, index) => (
              <tr key={index} className="hover:bg-gray-100">
                <td className="px-4 py-2 border">{index + 1}</td>
                <td className="px-4 py-2 border">
                  <Link
                    href={`/dashboard/classes/${gradeIdMap.get(item.grade) || '#'}`}
                    className="text-blue-600 hover:underline"
                  >
                    {item.grade}
                  </Link>
                </td>
                <td className="px-4 py-2 border">
                  <div className="flex items-center">
                    <span className="mr-2 w-10 text-right">{item.avg_danger_level.toFixed(2)}</span>
                    <div className="w-[100px] bg-gray-200 rounded-full h-2.5 flex-shrink-0">
                      <div
                        className={`h-2.5 ${item.avg_danger_level >= 2.5 ? 'bg-red-500' :
                            item.avg_danger_level >= 1.5 ? 'bg-yellow-500' : 'bg-orange-500'
                          }`}
                        style={{
                          width: `${Math.min(100, (item.avg_danger_level / 3) * 100)}%`,
                          borderRadius: '9999px'
                        }}
                      ></div>
                    </div>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TableContainer;