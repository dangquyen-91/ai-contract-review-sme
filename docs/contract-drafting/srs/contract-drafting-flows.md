---
type: srs-flows
feature: contract-drafting
updated: 2026-11-11
---

# Contract Drafting — Flows

## Flow: Tạo bản nháp hợp đồng từ mẫu
**Trigger**: Người dùng mở trang soạn thảo, chọn một mẫu hợp đồng và bấm mở mẫu
**Related UC**: TBD
**Related FR**: TBD
**Related E**: TBD

```mermaid
sequenceDiagram
    actor User
    participant UI as UI (DraftWorkspace + Next /api/contract-drafts)
    participant Ctl as Controller (contractDraft.routes)
    participant Svc as Service (contractDraft.service)
    participant Repo as Repo (UserModel, OrganizationModel, ContractDraftModel)
    participant DB as MongoDB

    User->>UI: Mở trang soạn thảo hợp đồng
    UI->>Ctl: GET /contract-drafts/templates (Bearer lawscan_access)
    Ctl->>Ctl: requireAuth + requireRole(owner, staff, user)
    break A1 - Vai trò không được soạn hợp đồng
        Ctl-->>UI: 403 Forbidden
        UI-->>User: Báo không có quyền soạn hợp đồng
    end
    Ctl->>Svc: templateCatalog(actor)
    Svc->>Repo: UserModel.findOne(sub, orgId, isActive).populate(roleId)
    Repo->>DB: Đọc thành viên đang hoạt động
    DB-->>Repo: member
    Repo-->>Svc: member + mã vai trò hiện tại
    Svc->>Repo: OrganizationModel.findById(orgId)
    Repo->>DB: Đọc tổ chức
    DB-->>Repo: organization
    Repo-->>Svc: organization {name, taxCode, address, isPersonal}
    Note over Svc,Repo: Tài khoản cá nhân chưa có không gian làm việc thì bỏ qua bước đọc tổ chức, dùng tên người dùng, mã số thuế và địa chỉ để trống
    break A2 - Thành viên ngừng hoạt động, vai trò đã đổi hoặc không gian làm việc không khớp loại tài khoản
        Svc-->>Ctl: AppError.forbidden
        Ctl-->>UI: 403 Quyền truy cập tổ chức đã thay đổi / Không gian làm việc không phù hợp với tài khoản
        UI-->>User: Hiện thông báo lỗi quyền
    end
    Svc->>Svc: Lọc mẫu (thuê nhà chỉ cho tài khoản cá nhân), bỏ phần nội dung điều khoản
    Svc-->>Ctl: templates + organization + role
    alt A3 - Tải danh mục thất bại (mất kết nối hoặc lỗi máy chủ)
        Ctl-->>UI: Lỗi tải danh mục mẫu
        UI-->>User: Hiện lỗi kèm nút Thử lại
    else Tải thành công
        Ctl-->>UI: 200 danh mục mẫu
        UI-->>User: Hiện thẻ mẫu kèm lựa chọn vai trò giao kết
    end

    User->>UI: Chọn vai trò giao kết, bấm mở mẫu
    UI->>UI: Khóa nút chống bấm hai lần, điền sẵn ngày ký, ngày bắt đầu là hôm nay, thời hạn xác định
    UI->>Ctl: POST /contract-drafts {templateCode, title, ourParty, editorMode studio, input}
    Ctl->>Ctl: requireAuth + requireRole + validate(createDraftSchema)
    break A5 - Dữ liệu gửi lên sai cấu trúc (mẫu lạ, tiêu đề quá ngắn hoặc dài, trường quá giới hạn)
        Ctl-->>UI: 400 Dữ liệu không hợp lệ
        UI-->>User: Mở khóa nút, hiện lỗi
    end
    Ctl->>Svc: createDraft(actor, body)
    Svc->>Repo: requireDraftAccess - đọc thành viên và tổ chức
    Repo->>DB: Đọc thành viên, tổ chức
    DB-->>Repo: member, organization
    Repo-->>Svc: organization
    break A2 - Mất quyền giữa chừng (vai trò đổi, ngừng hoạt động, không gian không khớp)
        Svc-->>Ctl: AppError.forbidden
        Ctl-->>UI: 403 Quyền truy cập tổ chức đã thay đổi
        UI-->>User: Mở khóa nút, hiện thông báo lỗi quyền
    end
    Svc->>Svc: Kiểm tra mẫu thuê nhà chỉ dành cho tài khoản cá nhân
    break A4 - Tài khoản doanh nghiệp chọn mẫu thuê nhà
        Svc-->>Ctl: AppError.forbidden
        Ctl-->>UI: 403 Mẫu thuê nhà hiện dành cho tài khoản cá nhân
        UI-->>User: Mở khóa nút, hiện lỗi
    end
    Svc->>Svc: Ghép giá trị mặc định của mẫu + tên, mã số thuế, địa chỉ tổ chức + input
    Svc->>Svc: validateInput(ourParty, các trường theo mẫu)
    break A5 - Vai trò giao kết sai hoặc trường không đúng định dạng
        Svc-->>Ctl: AppError.badRequest
        Ctl-->>UI: 400 Vai trò doanh nghiệp không hợp lệ / Trường không hợp lệ
        UI-->>User: Mở khóa nút, hiện lỗi
    end
    Svc->>Svc: buildStudioTemplate(template, values, tên tổ chức, ourParty)
    Svc->>Repo: ContractDraftModel.create(orgId, createdBy, templateCode, templateVersion, ourParty, inputJson, documentJson, content)
    Repo->>DB: Lưu bản nháp
    alt A6 - Lưu bản nháp thất bại
        DB-->>Repo: Lỗi ghi dữ liệu
        Repo-->>Svc: Lỗi
        Svc-->>Ctl: Lỗi chuyển cho errorHandler
        Ctl-->>UI: 500 Lỗi máy chủ
        UI-->>User: Mở khóa nút, hiện lỗi, cho bấm lại
    else Lưu thành công
        DB-->>Repo: draft {status draft, revision 0}
        Repo-->>Svc: draft
        Svc-->>Ctl: view(draft)
        Ctl-->>UI: 201 bản nháp
        UI->>UI: Lưu bản nháp vào cache, làm mới danh sách bản nháp
        UI-->>User: Chuyển sang màn chỉnh sửa /contract-drafts/:id
    end

    Note over Svc,Repo: Bản nháp lưu kèm phiên bản mẫu lúc tạo, nên khi mẫu được cập nhật thì bản cũ vẫn giữ nguyên nội dung
```
