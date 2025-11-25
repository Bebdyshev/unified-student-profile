'use client';

import { FC, useMemo, useState } from "react";
import { Pie } from "react-chartjs-2";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useRouter } from 'next/navigation';

ChartJS.register(ArcElement, Tooltip, Legend);

interface DangerousClass {
  grade: string;
  avg_danger_level: number;
}

interface ClassDangerPercentage {
  grade: string;
  "1": number;
  "2": number;
  "3": number;
  total: number;
}

interface ClassTableProps {
  dangerousClasses: DangerousClass[];
  classDangerPercentages?: ClassDangerPercentage[];
  gradeIdMap: Map<string, number>;
}

const COLORS = [
  "#FF0000", "#FFBB28", "#FF8042", "#0088FE", "#00C49F", "#FF69B4", "#A569BD", "#C0C0C0", "#40E0D0", "#FFD700"
];

const getColor = (index: number) => COLORS[index % COLORS.length];

const ChartContainer: FC<ClassTableProps> = ({ dangerousClasses, classDangerPercentages = [], gradeIdMap }) => {
  const [selectedGradeNumber, setSelectedGradeNumber] = useState<string | null>(null);
  const [selectedDangerLevel, setSelectedDangerLevel] = useState<string>("all");

  const gradeNumbers = useMemo(() => {
    if (!classDangerPercentages.length) return [];

    const gradeSet = new Set<string>();

    classDangerPercentages.forEach(item => {
      const match = item.grade.match(/^\d+/);
      if (match) {
        gradeSet.add(match[0]);
      }
    });

    return Array.from(gradeSet).sort((a, b) => Number(a) - Number(b));
  }, [classDangerPercentages]);

  const chartData = useMemo(() => {
    if (!classDangerPercentages.length) return null;

    let filteredClasses = selectedGradeNumber
      ? classDangerPercentages.filter(item => item.grade.startsWith(selectedGradeNumber))
      : classDangerPercentages;

    filteredClasses = filteredClasses.sort((a, b) => a.grade.localeCompare(b.grade));

    if (selectedDangerLevel === "all") {
      return {
        labels: filteredClasses.map(item => item.grade),
        datasets: [{
          data: filteredClasses.map(item => item.total),
          backgroundColor: filteredClasses.map((_, index) => getColor(index)),
          borderWidth: 2,
        }],
      };
    } else {
      const dangerLevel = parseInt(selectedDangerLevel);
      return {
        labels: filteredClasses.map(item => item.grade),
        datasets: [{
          data: filteredClasses.map(item => item[dangerLevel.toString() as keyof typeof item] as number),
          backgroundColor: filteredClasses.map((_, index) => getColor(index)),
          borderWidth: 2,
        }],
      };
    }
  }, [classDangerPercentages, selectedGradeNumber, selectedDangerLevel]);

  const chartTitle = useMemo(() => {
    if (selectedDangerLevel === "all") {
      return "Общий процент опасности";
    } else {
      const level = selectedDangerLevel === "3" ? "высокого" :
        selectedDangerLevel === "2" ? "среднего" : "низкого";
      return `Процент ${level} уровня опасности`;
    }
  }, [selectedDangerLevel]);

  console.log(selectedGradeNumber);
  const chartDescription = useMemo(() => {
    if (selectedGradeNumber) {
      return `${selectedGradeNumber} параллель`;
    }
    return "Все классы";
  }, [selectedGradeNumber]);

  const router = useRouter();

  const handleClassClick = (className: string) => {
    const gradeId = gradeIdMap.get(className);
    if (gradeId) {
      router.push(`/dashboard/classes/${gradeId}`);
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex justify-center gap-4 mb-4">
        <Select
          onValueChange={(value) => {
            console.log("Selected value:", value);
            setSelectedGradeNumber(value === 'all' ? null : value);
          }}
          value={selectedGradeNumber ?? "all"}
        >
          <SelectTrigger className="w-[40%]">
            <SelectValue placeholder="Все параллели" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все параллели</SelectItem>
            {gradeNumbers.map((number) => (
              <SelectItem key={number} value={number}>{number} класс</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          onValueChange={(value) => setSelectedDangerLevel(value)}
          value={selectedDangerLevel}
        >
          <SelectTrigger className="w-[40%]">
            <SelectValue placeholder="Все уровни опасности" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Общий процент</SelectItem>
            <SelectItem value="3">Высокий риск</SelectItem>
            <SelectItem value="2">Средний риск</SelectItem>
            <SelectItem value="1">Низкий риск</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card className="flex-1 overflow-hidden">
        <CardHeader className="items-center pb-2">
          <CardTitle>{chartTitle}</CardTitle>
          <CardDescription>{chartDescription}</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[calc(100%-80px)]">
          <div className="w-full h-full flex justify-center items-center">
            {chartData && chartData.labels.length > 0 ? (
              <Pie
                data={chartData}
                options={{
                  responsive: true,
                  maintainAspectRatio: true,
                  plugins: {
                    legend: {
                      display: true,
                      position: "bottom",
                      labels: {
                        boxWidth: 12,
                        padding: 10,
                        font: {
                          size: 11
                        }
                      }
                    },
                    tooltip: {
                      callbacks: {
                        label: (tooltipItem: any) => {
                          const label = tooltipItem.label;
                          const value = tooltipItem.raw;
                          return `${label}: ${value.toFixed(1)}%`;
                        },
                      },
                    },
                  },
                  onClick: (event, elements) => {
                    if (elements.length > 0) {
                      const index = elements[0].index;
                      const className = chartData.labels[index];
                      handleClassClick(className);
                    }
                  }
                }}
              />
            ) : (
              <p className="text-muted-foreground">Нет данных для отображения</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ChartContainer;
