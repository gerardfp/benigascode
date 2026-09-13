package com.benigascode.identity.service;

import com.benigascode.common.exception.ResourceNotFoundException;
import com.benigascode.common.exception.ValidationException;
import com.benigascode.identity.domain.InvitationCode;
import com.benigascode.identity.domain.User;
import com.benigascode.identity.dto.CreateInvitationRequest;
import com.benigascode.identity.dto.InvitationCodeDTO;
import com.benigascode.identity.dto.ValidateInvitationResponse;
import com.benigascode.identity.repository.InvitationCodeRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
public class TeacherInvitationService {

    private final InvitationCodeRepository invitationRepository;

    public TeacherInvitationService(InvitationCodeRepository invitationRepository) {
        this.invitationRepository = invitationRepository;
    }

    @Transactional(readOnly = true)
    public List<InvitationCodeDTO> listInvitations() {
        return invitationRepository.findAllByOrderByCreatedAtDesc().stream()
            .map(InvitationCodeDTO::fromEntity)
            .toList();
    }

    @Transactional
    public InvitationCodeDTO createInvitation(CreateInvitationRequest request, User teacher) {
        String cleanCode = request.code().trim();
        if (cleanCode.isBlank()) {
            throw new ValidationException("El código de invitación no puede estar vacío");
        }
        if (invitationRepository.existsByCode(cleanCode)) {
            throw new ValidationException("Ya existe una clave de invitación con el código: " + cleanCode);
        }

        boolean active = request.active() != null ? request.active() : true;
        InvitationCode entity = new InvitationCode(
            cleanCode,
            request.description() != null ? request.description().trim() : null,
            active,
            teacher
        );
        entity = invitationRepository.save(entity);
        return InvitationCodeDTO.fromEntity(entity);
    }

    @Transactional
    public InvitationCodeDTO toggleInvitation(UUID id, User teacher) {
        InvitationCode entity = invitationRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Clave de invitación no encontrada: " + id));

        entity.setActive(!entity.isActive());
        entity = invitationRepository.save(entity);
        return InvitationCodeDTO.fromEntity(entity);
    }

    @Transactional
    public void deleteInvitation(UUID id, User teacher) {
        InvitationCode entity = invitationRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Clave de invitación no encontrada: " + id));
        invitationRepository.delete(entity);
    }

    @Transactional(readOnly = true)
    public ValidateInvitationResponse validateInvitation(String code) {
        if (code == null || code.trim().isBlank()) {
            return new ValidateInvitationResponse(false, code, null, "La clave de invitación no puede estar vacía.");
        }

        Optional<InvitationCode> opt = invitationRepository.findByCode(code.trim());
        if (opt.isEmpty()) {
            return new ValidateInvitationResponse(false, code.trim(), null, "La clave de invitación no existe.");
        }

        InvitationCode ic = opt.get();
        if (!ic.isActive()) {
            return new ValidateInvitationResponse(false, ic.getCode(), ic.getDescription(), "La clave de invitación ha sido desactivada por el profesor.");
        }

        return new ValidateInvitationResponse(true, ic.getCode(), ic.getDescription(), "Clave de invitación válida.");
    }
}

