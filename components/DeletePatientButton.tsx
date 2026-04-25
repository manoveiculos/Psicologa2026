"use client";

import { Trash2 } from "lucide-react";
import { deletarPaciente } from "@/app/pacientes/actions";
import { useTransition } from "react";

export default function DeletePatientButton({ id, nome }: { id: string, nome: string }) {
  const [isPending, startTransition] = useTransition();

  async function handleDelete() {
    if (!confirm(`Tem certeza que deseja excluir o paciente ${nome}? Todos os dados de sessões e prontuários serão perdidos.`)) return;
    
    startTransition(async () => {
      try {
        await deletarPaciente(id);
      } catch (error) {
        alert("Erro ao deletar paciente.");
      }
    });
  }

  return (
    <button 
      onClick={handleDelete}
      disabled={isPending}
      className="p-2 text-slate-400 hover:text-red-500 transition-colors disabled:opacity-50"
      title="Excluir Paciente"
    >
      <Trash2 className="h-4 w-4" />
    </button>
  );
}
