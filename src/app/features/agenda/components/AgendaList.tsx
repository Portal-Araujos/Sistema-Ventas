"use client";

import React from "react";
import { Clock, MapPin, CheckCircle2, Circle, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { VisitForm } from "./VisitForm"; // <--- IMPORTAMOS EL NUEVO FORMULARIO

const mockAgenda = [
  {
    id: 1,
    time: "08:30 AM",
    institution: "Unidad Educativa San José",
    location: "La Libertad",
    type: "Presencial",
    status: "Completada",
  },
  {
    id: 2,
    time: "11:00 AM",
    institution: "Escuela Fiscal Mixta N° 25",
    location: "Santa Elena",
    type: "Presencial",
    status: "Pendiente",
  },
  {
    id: 3,
    time: "02:30 PM",
    institution: "Unidad Educativa 18 de Agosto",
    location: "Salinas",
    type: "Llamada",
    status: "Pendiente",
  },
];

export function AgendaList() {
  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide mb-4">
        <Button className="bg-primary text-white rounded-full px-6 shadow-sm">
          Hoy
        </Button>
        <Button
          variant="outline"
          className="bg-white text-gray-600 rounded-full px-6 border-gray-200 hover:bg-gray-50"
        >
          Mañana
        </Button>
        <Button
          variant="outline"
          className="bg-white text-gray-600 rounded-full px-6 border-gray-200 hover:bg-gray-50"
        >
          Esta semana
        </Button>
      </div>

      <div className="space-y-4">
        {mockAgenda.map((item, index) => {
          const isCompleted = item.status === "Completada";

          return (
            <div key={item.id} className="flex gap-4">
              <div className="flex flex-col items-center pt-2">
                <span className="text-xs font-bold text-gray-500 w-16 text-right pr-2">
                  {item.time}
                </span>
                <div
                  className={`w-0.5 h-full mt-2 ${index === mockAgenda.length - 1 ? "bg-transparent" : "bg-gray-200"}`}
                ></div>
              </div>

              <Card
                className={`flex-1 border-none shadow-sm transition-all ${isCompleted ? "bg-gray-50 opacity-75" : "bg-white border-l-4 border-l-primary"}`}
              >
                <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      {isCompleted ? (
                        <CheckCircle2
                          size={18}
                          className="text-status-success"
                        />
                      ) : (
                        <Circle size={18} className="text-primary" />
                      )}
                      <h3
                        className={`font-bold text-base ${isCompleted ? "text-gray-500 line-through" : "text-gray-900"}`}
                      >
                        {item.institution}
                      </h3>
                    </div>

                    <div className="flex items-center gap-3 text-xs font-medium text-gray-500 pl-6">
                      <span className="flex items-center gap-1">
                        <MapPin size={14} className="text-gray-400" />
                        {item.location}
                      </span>
                      <span className="flex items-center gap-1">
                        {item.type === "Llamada" ? (
                          <Phone size={14} className="text-gray-400" />
                        ) : (
                          <Clock size={14} className="text-gray-400" />
                        )}
                        {item.type}
                      </span>
                    </div>
                  </div>

                  {/* AQUÍ INYECTAMOS NUESTRO FORMULARIO INTELIGENTE */}
                  {!isCompleted && (
                    <VisitForm institutionName={item.institution} />
                  )}
                </CardContent>
              </Card>
            </div>
          );
        })}
      </div>
    </div>
  );
}
